# 工具集 Tool App

一款集合日常实用小工具的移动端应用，基于 React + Capacitor 构建，支持打包为 Android APK。所有数据存储在本地，无需联网，保护隐私。

## 功能一览

### 纪念日与生日提醒

- 记录生日、纪念日、自定义纪念事件
- 支持**阳历**和**农历**两种日历模式，农历自动转换为阳历提醒
- 查看距离下次纪念日的天数，按类别筛选
- 详情页展示完整的日期信息和倒计时

### 倒数日

- 自定义目标日期，查看距离目标还有多少天
- **一键导入中国节假日**（元旦、春节、清明、端午、中秋等 16 个节日，农历自动转换）
- 自定义图标和备注，已过期事件标灰显示

### 习惯打卡

- 创建每日习惯，支持自定义 emoji 图标和颜色
- 按周查看打卡日历，连续打卡天数统计
- 直观的打卡记录展示

### 待办清单

- 快速添加待办事项，点击完成/取消
- 按状态筛选：全部 / 进行中 / 已完成
- 一键清除已完成项

### 喝水记录

- 设定每日饮水目标，快速添加饮水量（100~500ml）
- 支持自定义饮水量输入
- 圆形进度环直观显示完成百分比，每日饮水日志

### 体重记录

- 记录每日体重，ECharts 趋势图可视化
- 统计当前体重、最低值、最高值、平均值
- 管理历史记录

### 番茄钟

- 标准番茄工作法：25 分钟专注 / 5 分钟短休息 / 15 分钟长休息
- 自动切换工作与休息阶段
- 已完成番茄数统计

### BMI 计算器

- 输入身高体重，区分性别，计算 BMI 值
- 显示对应体重分类（偏瘦 / 正常 / 超重 / 肥胖）
- 附 BMI 参考范围表

### 个税计算器

- 输入月薪、五险一金、专项附加扣除
- 按 5000 元起征点和累进税率自动计算
- 显示应纳税额和税后收入

### 随机决策器

- 输入多个选项，随机抽取结果
- 内置常用模板（今天吃什么、选哪个等）
- 旋转动画展示抽取过程

### 二维码生成

- 输入文本或网址，即时生成二维码
- 支持保存为 PNG 图片

### 尺子

- 屏幕上显示真实比例尺
- 支持厘米和英寸双面刻度

## 技术栈

| 类别 | 技术 |
|------|------|
| 前端框架 | React 19 + TypeScript |
| 构建工具 | Vite 7 |
| 移动端打包 | Capacitor 8 (Android) |
| 路由 | React Router v7 (HashRouter) |
| 本地存储 | localforage (IndexedDB) |
| 日期处理 | dayjs + lunar-javascript（农历支持） |
| 图表 | ECharts 6 + echarts-for-react |
| 图标 | lucide-react |
| 二维码 | qrcode |

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 同步到 Android 工程
npm run cap:sync

# 打开 Android Studio
npm run cap:open
```

## 项目结构

```
src/
├── components/       # 公共组件（TabBar 等）
├── pages/            # 页面组件
│   ├── Home.tsx          # 首页
│   ├── Toolbox.tsx       # 工具箱（分类展示）
│   ├── Anniversary.tsx   # 纪念日列表
│   ├── AddEvent.tsx      # 添加/编辑纪念日
│   ├── EventDetail.tsx   # 纪念日详情
│   ├── Profile.tsx       # 个人/设置
│   ├── Countdown.tsx     # 倒数日
│   ├── HabitTracker.tsx  # 习惯打卡
│   ├── TodoList.tsx      # 待办清单
│   ├── WaterTracker.tsx  # 喝水记录
│   ├── WeightTracker.tsx # 体重记录
│   ├── Pomodoro.tsx      # 番茄钟
│   ├── BmiCalc.tsx       # BMI 计算器
│   ├── TaxCalc.tsx       # 个税计算器
│   ├── RandomPick.tsx    # 随机决策器
│   ├── QrCode.tsx        # 二维码生成
│   └── Ruler.tsx         # 尺子
├── stores/           # 数据存储层（localforage）
├── types/            # TypeScript 类型定义
├── utils/            # 工具函数（日期计算等）
└── App.tsx           # 路由配置
```

## 版本管理

项目配置了 Git `pre-commit` 钩子，每次提交自动递增 patch 版本号，并同步更新 `package.json`、`package-lock.json`、`Profile.tsx`、`build.gradle`。
