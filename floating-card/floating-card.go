/*
 * 悬浮卡插件后端。blank import 时跑 init()，plugin.Register。
 *
 * 所有卡都一样：html/css/js 在数据目录
 * {dataDir}/cards/{名字}/ 里，直接用编辑器改文件即可，不用走后台保存。
 * Docker 把 /data 做成 volume 后，卡片就在 /data/floating-card，重启不丢。
 */
package floating_card

import (
	"embed"
	"encoding/json"
	"io/fs"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"

	"github.com/apache/answer/plugin"
	"github.com/gin-gonic/gin"
	"github.com/lusgli-0/lusgli-0-answer-plugin/floating-card/i18n"
	pluginshared "github.com/lusgli-0/lusgli-0-answer-plugin/plugin-shared"
)

//go:embed info.yaml
var infoFS embed.FS

// cards/ 出厂卡源码（第一次拷进数据目录用）；runtime/overlay.css 是共用遮罩。
// 仍 embed runtime，vendor 里才有 TS，tsc 才找得到模块。
//
//go:embed cards
//go:embed runtime
var defaultFS embed.FS

// factoryCardIDs 第一次初始化时落盘的出厂卡。删掉对应文件夹后不会再复活。
var factoryCardIDs = []string{"guide", "rune"}

// Features 只留 tilt。粒子在 guide.css/js，每日一签在 rune.js。
type Features struct {
	Tilt bool `json:"tilt"`
}

type Card struct {
	CardID   string         `json:"card_id"`
	Features Features       `json:"features"`
	HTML     string         `json:"html"`
	CSS      string         `json:"css"`
	JS       string         `json:"js"`
	Data     map[string]any `json:"data,omitempty"`
}

type PublicConfig struct {
	SharedCSS string `json:"shared_css"`
	Cards     []Card `json:"cards"`
}

// cardMeta 每张卡文件夹里可选的 card.json，只放元数据（tilt / data）。
// html/css/js 以同名文件为准，不在这里重复。
type cardMeta struct {
	Features *Features      `json:"features"`
	Data     map[string]any `json:"data"`
}

type FloatingCard struct {
	mu     sync.RWMutex
	public *PublicConfig
}

func init() {
	ensureDataDir()
	p := &FloatingCard{}
	p.rebuildPublic()
	plugin.Register(p)
}

func (p *FloatingCard) Info() plugin.Info {
	info := pluginshared.ReadInfo(infoFS, "info.yaml", "floating_card")
	return plugin.Info{
		Name:        plugin.MakeTranslator(i18n.InfoName),
		SlugName:    info.SlugName,
		Description: plugin.MakeTranslator(i18n.InfoDescription),
		Author:      info.Author,
		Version:     info.Version,
		Link:        info.Link,
	}
}

// ConfigFields 只解释「文件在哪、怎么用」，没有可编辑项。
// 卡片一律在数据目录里改文件，不走这里的表单。
func (p *FloatingCard) ConfigFields() []plugin.ConfigField {
	return []plugin.ConfigField{
		{
			Name:        "cards_dir",
			Type:        plugin.ConfigTypeInput,
			Title:       plugin.MakeTranslator(i18n.ConfigDirTitle),
			Description: plugin.MakeTranslator(i18n.ConfigDirDesc),
			Value:       dataDirAbs(),
		},
		{
			Name:        "usage",
			Type:        plugin.ConfigTypeLegend,
			Title:       plugin.MakeTranslator(i18n.ConfigUsageTitle),
			Description: plugin.MakeTranslator(i18n.ConfigUsageDesc),
		},
	}
}

// ConfigReceiver 没有需要保存的配置；点保存只触发一次重建（重新扫一遍文件夹）。
func (p *FloatingCard) ConfigReceiver(_ []byte) error {
	p.rebuildPublic()
	return nil
}

// RegisterUnAuthRouter 挂到 mustUnAuthV1（前缀 /answer/api/v1），所以完整路径是 /answer/api/v1/floating-card/config。
func (p *FloatingCard) RegisterUnAuthRouter(r *gin.RouterGroup) {
	r.GET("/floating-card/config", p.handlePublicConfig)
}

func (p *FloatingCard) RegisterAuthUserRouter(_ *gin.RouterGroup) {}

func (p *FloatingCard) RegisterAuthAdminRouter(_ *gin.RouterGroup) {}

func (p *FloatingCard) handlePublicConfig(ctx *gin.Context) {
	// Agent 路由启动时总会注册（MakePlugin super=true），所以这里自己看启用状态
	if !plugin.StatusManager.IsEnabled(p.Info().SlugName) {
		pluginshared.WriteAPI(ctx, PublicConfig{SharedCSS: "", Cards: []Card{}})
		return
	}
	// 每次请求重新读 cards/，改完文件刷新前台就能看见，不用重启后端。
	p.rebuildPublic()
	p.mu.RLock()
	out := p.public
	p.mu.RUnlock()
	if out == nil {
		out = fallbackPublic()
	}
	pluginshared.WriteAPI(ctx, out)
}

func (p *FloatingCard) rebuildPublic() {
	p.mu.Lock()
	p.rebuildPublicLocked()
	p.mu.Unlock()
}

func (p *FloatingCard) rebuildPublicLocked() {
	ids := listCardIDs()
	merged := make([]Card, 0, len(ids))
	for _, id := range ids {
		merged = append(merged, mergeCard(id))
	}
	p.public = &PublicConfig{
		SharedCSS: mustFile("runtime/overlay.css"),
		Cards:     merged,
	}
}

// ---- 数据目录定位 ------------------------------------------------------------
// 插件是独立 Go 模块（answer build 编进临时 module answer），不能 import 主站
// internal/base/path，所以数据目录自己从启动参数里找。

// resolveDataDir 找 Answer 数据目录：-C/--data-path → ANSWER_DATA_PATH → 默认 /data。
func resolveDataDir() string {
	args := os.Args
	for i := 0; i < len(args); i++ {
		switch a := args[i]; {
		case a == "-C" || a == "--data-path":
			if i+1 < len(args) {
				return args[i+1]
			}
		case strings.HasPrefix(a, "-C="):
			return strings.TrimPrefix(a, "-C=")
		case strings.HasPrefix(a, "--data-path="):
			return strings.TrimPrefix(a, "--data-path=")
		}
	}
	if v := os.Getenv("ANSWER_DATA_PATH"); v != "" {
		return v
	}
	return "/data"
}

// floatingCardDir 悬浮卡在数据目录里的根：{dataDir}/floating-card。
func floatingCardDir() string {
	return filepath.Join(resolveDataDir(), "floating-card")
}

func cardsDir() string {
	return filepath.Join(floatingCardDir(), "cards")
}

// dataDirAbs 设置页展示用的绝对路径。
func dataDirAbs() string {
	abs, err := filepath.Abs(floatingCardDir())
	if err != nil {
		return floatingCardDir()
	}
	return abs
}

// ---- 首次落盘出厂卡 ----------------------------------------------------------

func ensureDataDir() {
	cards := cardsDir()
	_, err := os.Stat(cards)
	seedNeeded := os.IsNotExist(err)
	if err := os.MkdirAll(cards, 0o755); err != nil {
		log.Printf("[floating-card] mkdir cards failed: %v", err)
		return
	}
	// 只有 cards/ 第一次被创建才种出厂卡；之后删卡不复活。
	if !seedNeeded {
		return
	}
	for _, id := range factoryCardIDs {
		seedCard(id)
	}
}

// seedCard 把 embedded 的 cards/{id}/ 拷进数据目录。跳过 .ts（运行期用不到）。
func seedCard(id string) {
	prefix := "cards/" + id
	err := fs.WalkDir(defaultFS, prefix, func(p string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			return nil
		}
		rel := strings.TrimPrefix(p, prefix+"/")
		if strings.HasSuffix(rel, ".ts") {
			return nil
		}
		data, err := defaultFS.ReadFile(p)
		if err != nil {
			return err
		}
		dst := filepath.Join(cardsDir(), id, filepath.FromSlash(rel))
		if err := os.MkdirAll(filepath.Dir(dst), 0o755); err != nil {
			return err
		}
		return os.WriteFile(dst, data, 0o644)
	})
	if err != nil {
		log.Printf("[floating-card] seed card %s failed: %v", id, err)
	}
}

// ---- 读卡 -------------------------------------------------------------------

func listCardIDs() []string {
	entries, err := os.ReadDir(cardsDir())
	if err != nil {
		return nil
	}
	ids := make([]string, 0, len(entries))
	for _, e := range entries {
		if e.IsDir() {
			ids = append(ids, e.Name())
		}
	}
	sort.Strings(ids)
	return ids
}

func mergeCard(id string) Card {
	dir := filepath.Join(cardsDir(), id)
	meta := readCardMeta(filepath.Join(dir, "card.json"))
	card := Card{
		CardID:   id,
		Features: Features{Tilt: true},
		HTML:     readFileIfExists(filepath.Join(dir, id+".html")),
		CSS:      readFileIfExists(filepath.Join(dir, id+".css")),
		JS:       readFileIfExists(filepath.Join(dir, id+".js")),
		Data:     meta.Data,
	}
	if meta.Features != nil {
		card.Features = *meta.Features
	}
	// deck.json 兜底：card.json 没写 deck 时，把同目录 deck.json 当牌组读进来。
	if _, ok := card.Data["deck"]; !ok {
		if deck := readJSON(filepath.Join(dir, "deck.json")); deck != nil {
			if card.Data == nil {
				card.Data = map[string]any{}
			}
			card.Data["deck"] = deck
			if _, ok := card.Data["storage_key"]; !ok {
				card.Data["storage_key"] = "ans-rune-daily"
			}
		}
	}
	return card
}

func readFileIfExists(p string) string {
	b, err := os.ReadFile(p)
	if err != nil {
		return ""
	}
	return string(b)
}

func readCardMeta(p string) *cardMeta {
	meta := &cardMeta{}
	b, err := os.ReadFile(p)
	if err != nil {
		return meta
	}
	_ = json.Unmarshal(b, meta)
	return meta
}

func readJSON(p string) any {
	b, err := os.ReadFile(p)
	if err != nil {
		return nil
	}
	var v any
	if err := json.Unmarshal(b, &v); err != nil {
		return nil
	}
	return v
}

// mustFile 从 embedded defaultFS 读文件（runtime/overlay.css 等），缺失直接 panic。
func mustFile(rel string) string {
	b, err := defaultFS.ReadFile(rel)
	if err != nil {
		panic("floating-card: missing embedded file " + rel + ": " + err.Error())
	}
	return string(b)
}

// fallbackPublic 数据目录异常时的兜底：直接用 embedded 出厂卡。
func fallbackPublic() *PublicConfig {
	cards := make([]Card, 0, len(factoryCardIDs))
	for _, id := range factoryCardIDs {
		cards = append(cards, embeddedCard(id))
	}
	return &PublicConfig{
		SharedCSS: mustFile("runtime/overlay.css"),
		Cards:     cards,
	}
}

func embeddedCard(id string) Card {
	card := Card{
		CardID:   id,
		Features: Features{Tilt: true},
		HTML:     readEmbedded("cards/" + id + "/" + id + ".html"),
		CSS:      readEmbedded("cards/" + id + "/" + id + ".css"),
		JS:       readEmbedded("cards/" + id + "/" + id + ".js"),
	}
	if deck := readEmbeddedJSON("cards/" + id + "/deck.json"); deck != nil {
		card.Data = map[string]any{
			"deck":        deck,
			"storage_key": "ans-rune-daily",
		}
	}
	return card
}

func readEmbedded(p string) string {
	b, err := defaultFS.ReadFile(p)
	if err != nil {
		return ""
	}
	return string(b)
}

func readEmbeddedJSON(p string) any {
	b, err := defaultFS.ReadFile(p)
	if err != nil {
		return nil
	}
	var v any
	if err := json.Unmarshal(b, &v); err != nil {
		return nil
	}
	return v
}
