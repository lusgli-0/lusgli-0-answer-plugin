# lusgli-0-answer-plugin

先把 6 个目录全部推上去（含还没 tidy 的消费者）
cd lusgli-0-answer-plugin
git init && git add -A && git commit -m "publish plugins"
git remote add origin https://github.com/lusgli-0/lusgli-0-answer-plugin.git
git push -u origin main

打 tag 并推 tag —— 此刻 plugin-shared@v0.1.0 在 GitHub 上就能被解析了
git tag v0.1.0
git push origin v0.1.0

现在才能 tidy 消费者（能拉到 plugin-shared@v0.1.0 了）
cd community-menu  && go mod tidy
cd ../random-question && go mod tidy
cd ../floating-card  && go mod tidy
cd ../hello-banner   && go mod tidy

把 tidy 更新出来的 go.mod / go.sum 再提交推一次（"一起推"）
cd ..
git add -A && git commit -m "go mod tidy"
git push

进linux终端
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
1. Alpine 的官方软件源 `dl-cdn.alpinelinux.org` 国内连不上：
解决方法：
```bash
cd /www/wwwroot/answer
sed -i '/^FROM /a RUN sed -i "s/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g" /etc/apk/repositories' Dockerfile
sed -i 's|# ENV GOPROXY=https://proxy.golang.com.cn,direct|ENV GOPROXY=https://goproxy.cn,direct|' Dockerfile
```
