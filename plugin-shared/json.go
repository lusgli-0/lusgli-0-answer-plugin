package pluginshared

import (
	"encoding/json"
	"strings"
)

// AsJSONArray 只保证 HTTP 响应里某字段是一段合法 JSON 数组。
// 空串、坏 JSON、不是数组 → []。不解释数组元素的业务含义。
func AsJSONArray(raw string) json.RawMessage {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return json.RawMessage("[]")
	}
	var probe []json.RawMessage
	if err := json.Unmarshal([]byte(trimmed), &probe); err != nil {
		return json.RawMessage("[]")
	}
	return json.RawMessage(trimmed)
}

// ParseLines 按行切分，去掉空行和首尾空白。textarea「一行一条」常用。
func ParseLines(raw string) []string {
	lines := strings.Split(raw, "\n")
	out := make([]string, 0, len(lines))
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		out = append(out, line)
	}
	return out
}
