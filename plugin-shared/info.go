package pluginshared

import (
	"embed"
	"fmt"

	"gopkg.in/yaml.v3"
)

// YamlInfo 只用来读插件 info.yaml。`yaml:"slug_name"` 告诉解析器：
// YAML 里的键 slug_name 填到这个字段。
type YamlInfo struct {
	SlugName string `yaml:"slug_name"`
	Type     string `yaml:"type"`
	Version  string `yaml:"version"`
	Author   string `yaml:"author"`
	Link     string `yaml:"link"`
}

// ReadInfo 读调用方自己的 info.yaml（本库不是插件，没有自己的 yaml）。
// defaultSlug 必须由调用方传入：共享层没有默认 hello_banner / random_question。
// 读失败时至少保住 slug，避免后台列表出现空名字。
func ReadInfo(fs embed.FS, filename, defaultSlug string) YamlInfo {
	info := YamlInfo{SlugName: defaultSlug}
	raw, err := fs.ReadFile(filename)
	if err != nil {
		fmt.Println(err)
		return info
	}
	if err = yaml.Unmarshal(raw, &info); err != nil {
		fmt.Println(err)
	}
	return info
}
