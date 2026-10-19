package pluginshared

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// WriteAPI 模仿 Answer 官方 handler.HandleResponse 的外壳 {code, reason, msg, data}。
//
// 为什么必须自己拼：插件不能 import 主站 internal 包（internal 只允许主模块用）。
// 前端 axios 拦截器认这套信封，只取 data。code 用 200 表示成功。
func WriteAPI(ctx *gin.Context, data any) {
	ctx.JSON(http.StatusOK, gin.H{
		"code":   http.StatusOK,
		"reason": "success",
		"msg":    "",
		"data":   data,
	})
}
