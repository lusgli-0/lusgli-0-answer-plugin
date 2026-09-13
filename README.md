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

