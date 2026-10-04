/*
 * 此文件负责读取数据目录中的cell。
 *
 * cell的结构：frontend：html+css+js backend：cell自定义后端
 * {dataDir}/cells/{名字}/ 里，直接用编辑器改文件，刷新可立即生效。
 * Docker 把 /data 做成 volume 后，卡片就在 /data/lite-runtime。
 */
package lite_runtime

import (
	"embed"
	"os"
	"path/filepath"
	"strings"

	"github.com/apache/answer/plugin"
	"github.com/gin-gonic/gin"
	"github.com/lusgli-0/lusgli-0-answer-plugin/lite-runtime/i18n"
	pluginshared "github.com/lusgli-0/lusgli-0-answer-plugin/plugin-shared"
)

//go:embed info.yaml
var infoFS embed.FS

// runtime/mount/overlay/overlay.css 是共用遮罩。cell 本身完全由数据目录提供。
//
//go:embed runtime
var defaultFS embed.FS

type Cell struct {
	CellID string `json:"cell_id"`
	HTML   string `json:"html"`
	CSS    string `json:"css"`
	JS     string `json:"js"`
}

type PublicConfig struct {
	SharedCSS string `json:"shared_css"`
	Cells     []Cell `json:"cells"`
}

type LiteRuntime struct {
}

func init() {
	_ = os.MkdirAll(cellsDir(), 0o755)
	plugin.Register(&LiteRuntime{})
}

func (p *LiteRuntime) Info() plugin.Info {
	info := pluginshared.ReadInfo(infoFS, "info.yaml", "lite_runtime")
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
func (p *LiteRuntime) ConfigFields() []plugin.ConfigField {
	return []plugin.ConfigField{
		{
			Name:        "cells_dir",
			Type:        plugin.ConfigTypeLegend,
			Title:       plugin.MakeTranslator(i18n.ConfigDirTitle),
			Description: plugin.MakeTranslator(filepath.Join(resolveDataDir(), "lite-runtime")),
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
func (p *LiteRuntime) ConfigReceiver(_ []byte) error {
	return nil
}

// RegisterUnAuthRouter 挂到 mustUnAuthV1（前缀 /answer/api/v1），所以完整路径是 /answer/api/v1/lite-runtime/config。
func (p *LiteRuntime) RegisterUnAuthRouter(r *gin.RouterGroup) {
	r.GET("/lite-runtime/config", p.handlePublicConfig)
}

func (p *LiteRuntime) RegisterAuthUserRouter(_ *gin.RouterGroup) {}

func (p *LiteRuntime) RegisterAuthAdminRouter(_ *gin.RouterGroup) {}

// 每次前端请求配置时读取一次目录。刷新页面会再次请求
func (p *LiteRuntime) handlePublicConfig(ctx *gin.Context) {
	entries, _ := os.ReadDir(cellsDir())
	cells := make([]Cell, 0, len(entries))
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}

		id := entry.Name()
		frontendDir := filepath.Join(cellsDir(), id, "frontend")
		read := func(ext string) string {
			data, _ := os.ReadFile(filepath.Join(frontendDir, id+ext))
			return string(data)
		}

		cells = append(cells, Cell{
			CellID: id,
			HTML:   read(".html"),
			CSS:    read(".css"),
			JS:     read(".js"),
		})
	}

	pluginshared.WriteAPI(ctx, PublicConfig{
		SharedCSS: mustFile("runtime/mount/overlay/overlay.css"),
		Cells:     cells,
	})
}

// 数据目录定位：
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

func cellsDir() string {
	return filepath.Join(resolveDataDir(), "lite-runtime", "cells")
}

// mustFile 从 embedded defaultFS 读文件（runtime/overlay.css 等），缺失直接 panic。
func mustFile(rel string) string {
	b, err := defaultFS.ReadFile(rel)
	if err != nil {
		panic("lite-runtime: missing embedded file " + rel + ": " + err.Error())
	}
	return string(b)
}
