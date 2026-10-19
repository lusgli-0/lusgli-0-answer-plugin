```powershell
$baseUrl = "http://localhost:9080"
$token = ""
$kbId = "1"
$docId = "1"

$headers = @{ Authorization = "Bearer $token" }
$uri = "$($baseUrl.TrimEnd('/'))/answer/admin/api/knowledge-base/$kbId/documents/$docId"

Write-Host "请求地址：$uri"

$json = '{"title":"\u66f4\u65b0\u540e\u7684\u6807\u9898","content":"\u8fd9\u662f\u66f4\u65b0\u540e\u7684\u6587\u6863\u5185\u5bb9\u3002"}'
$body = [System.Text.Encoding]::UTF8.GetBytes($json)

Invoke-RestMethod -Method Put `
  -Uri $uri `
  -Headers $headers `
  -ContentType "application/json; charset=utf-8" `
  -Body $body

curl.exe -H "Authorization: Bearer 你的管理员Token" "你的站点地址/answer/admin/api/knowledge-base/health"

$json = '{"title":"\u4ea7\u54c1\u6587\u6863"}'
$body = [System.Text.Encoding]::UTF8.GetBytes($json)

Invoke-RestMethod -Method Post `
  -Uri "$baseUrl/answer/admin/api/knowledge-base" `
  -Headers $headers `
  -ContentType "application/json; charset=utf-8" `
  -Body $body
```

### 在知识库中添加文本

将 `$knowledgeBaseId` 替换为创建知识库时返回的 ID。中文使用 JSON Unicode 转义，避免 Windows PowerShell 将中文命令行参数编码错误。

```powershell
$knowledgeBaseId = "1"
$json = '{"title":"\u4ea7\u54c1\u6587\u6863","content":"\u8fd9\u662f\u77e5\u8bc6\u5e93\u4e2d\u7684\u793a\u4f8b\u6587\u672c\u3002"}'
$body = [System.Text.Encoding]::UTF8.GetBytes($json)

Invoke-RestMethod -Method Post `
  -Uri "$baseUrl/answer/admin/api/knowledge-base/$knowledgeBaseId/documents" `
  -Headers $headers `
  -ContentType "application/json; charset=utf-8" `
  -Body $body

  curl.exe -i "$base/knowledge-base/$knowledgeBaseId/documents" `
  -H "Authorization: Bearer $token"
```
