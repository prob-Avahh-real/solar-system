# 太阳系探索

3D 太阳系行星天体模拟，支持可视化观看、点击放大、文字讲解与语音互动。

## 功能

- **3D 太阳系模拟** — 太阳及八大行星公转、自转，土星环，星空背景
- **点击/选择行星** — 点击 3D 模型或底部导航栏，相机平滑聚焦放大
- **详细讲解** — 每颗天体附带科学数据、描述与有趣事实
- **语音讲解** — 中文 TTS 朗读行星介绍
- **语音提问** — 语音识别，可问大小、温度、距离、公转周期等
- **移动端** — 响应式布局，支持 Android APK（Capacitor）
- **智能硬件** — 智能戒指倾斜切换行星、摇晃触发讲解；智能手杖敲击语音提问

## 开发

```bash
npm install
npm run dev
```

浏览器打开 http://localhost:5173

## 构建 Android APK

```bash
npm run build
npx cap add android   # 首次
npm run cap:sync
cd android && ./gradlew assembleDebug
```

## 语音互动示例

选中行星后点击「语音提问」，可以说：

- 「这颗行星有多大？」
- 「距离太阳多远？」
- 「表面温度多少？」
- 「公转周期是多少？」
- 「有什么有趣的事实？」

## 技术栈

- Three.js — 3D 渲染
- Web Speech API — 语音合成与识别
- Vite — 构建
- Capacitor — 移动端打包
