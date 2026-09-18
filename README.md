# lusgli-0-answer-plugin

先把 6 个目录全部推上去
```bash
cd lusgli-0-answer-plugin
git init && git add -A && git commit -m "publish plugins"
git remote add origin https://github.com/lusgli-0/lusgli-0-answer-plugin.git
git push -u origin main
```

打 tag 并推 tag —— 此刻 plugin-shared@v0.1.0 在 GitHub 上就能被解析了
注意：一个仓库多个 module，tag 必须带目录前缀，别打根 tag v0.1.0
```bash
git tag plugin-shared/v0.1.0
git tag community-menu/v0.1.0
git tag random-question/v0.1.0
git tag floating-card/v0.1.0
git tag hello-banner/v0.1.0
git push origin --tags
```

现在才能 tidy 消费者（能拉到 plugin-shared@v0.1.0 了）
```bash
cd community-menu  && go mod tidy
cd ../random-question && go mod tidy
cd ../floating-card  && go mod tidy
cd ../hello-banner   && go mod tidy
```

把 tidy 更新出来的 go.mod / go.sum 再提交推一次
```bash
cd ..
git add -A && git commit -m "go mod tidy"
git push
```

进linux终端
```bash
cd /www/wwwroot
git clone https://github.com/apache/answer.git answer
cd answer
cat > script/plugin_list <<'EOF'
github.com/apache/answer-plugins/connector-basic@latest
github.com/apache/answer-plugins/reviewer-basic@latest
github.com/apache/answer-plugins/captcha-basic@latest
github.com/apache/answer-plugins/render-markdown-codehighlight@latest
github.com/lusgli-0/lusgli-0-answer-plugin/plugin-shared@v0.1.0
github.com/lusgli-0/lusgli-0-answer-plugin/community-menu@v0.1.0
github.com/lusgli-0/lusgli-0-answer-plugin/random-question@v0.1.0
github.com/lusgli-0/lusgli-0-answer-plugin/floating-card@v0.1.0
github.com/lusgli-0/lusgli-0-answer-plugin/hello-banner@v0.1.0
EOF
docker build -t answer
```

找到你的 `docker-compose.yml`，把里面这一行：
```yaml
image: apache/answer
```
改成：
```yaml
image: answer
```
记得先停旧容器：
```bash
docker stop <旧容器名>
```
在 `docker-compose.yml` 所在目录，跑：
```bash
docker compose up -d
```
然后验证：
```bash
docker compose exec answer /usr/bin/answer plugin
```

编译没成功的原因：
1. Alpine 和 Golang 的官方源国内连不上：
解决方法：
```bash
cd /www/wwwroot/answer
sed -i '/^FROM /a RUN sed -i "s/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g" /etc/apk/repositories' Dockerfile
sed -i 's|# ENV GOPROXY=https://proxy.golang.com.cn,direct|ENV GOPROXY=https://goproxy.cn,direct|' Dockerfile
```
2. FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory：
原因：
Node.js 堆内存溢出。它在用 `react-app-rewired build`（webpack）打包 Answer 的前端 React 界面时，内存冲到 ~1000MB 就撞到上限崩了。
解决办法：
给 Node 加内存
```bash
sed -i '/^ENV ANSWER_MODULE/a ENV NODE_OPTIONS=--max-old-space-size=2048' Dockerfile
```
或是在另一台内存充足的机器上先构建，然后把tar文件传到服务器
```bash
docker build -t answer .
docker save answer -o answer.tar
#在服务器上把tar传上去，然后：
docker load -i answer.tar
docker compose up
```
3. HTTP/2 stream error:
在`ENV GOPROXY=https://goproxy.cn,direct`下面加一行
```
ENV GODEBUG=http2client=0
```