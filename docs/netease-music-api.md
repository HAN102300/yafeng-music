# 网易云音乐 音乐API文档（本地合并版）

> 来源：网易云开放平台 https://music.163.com/st/developer/document 【音乐API文档】栏目（浏览器自动抓取合并，抓取于 2026-08）。
> 「用户登录API」全量收录；其余分类收录接口定义与参数表（超长请求/返回示例略）。

> **体系差异（重要）**：本文档为「开放平台 openapi」体系（/openapi/**，需注册合作方 appId + 应用签名，OAuth2 accessToken 流程），个人学习项目无法直接调用。本站实际使用的是 Web 端 weapi/明文 api 逆向接口（见文末对照笔记）。


## 公共

### 访问方式

访问方式
不同的接口会要求使用GET或POST方式请求，文档中如果没有特殊标识，默认是使用GET请求
权限控制
为规范接口调用、保障服务安全、实现精细化运营及商业化策略，在OpenAPI体系中有一套完整的权限控制机制

模块
核心功能
实现逻辑

接口鉴权
验证请求合法性
1. 签名校验：业务方需使用预置密钥，对请求参数和当前 Unix 时间戳生成 sign。服务端校验其正确性。2. 时效性校验：校验 timestamp，拒绝过期请求（如 >5 分钟）

访问频率限制
防盗刷
1. 限流对象：AppID中的各个接口为单位进行限流。2. 触发机制：当调用频率超过约定阈值50，触发限流，返回-444、-445、-446。

用户会员身份
内容差异化
身份识别：解析用户登录态，返回差异化数据：仅向会员返回可播放的音频链接，非会员返回试听片段或无链接）。具体字段见各接口文档。

默认登录策略
优化算法推荐
网易云将根据部分接口类型，强制要求登录策略。

### IOT端公共参数

IOT端公共参数
使用范围：车载、手表、音箱、电视、智能硬件等所有iot设备（移动端app亦可）

公共参数：

参数名
类型
必选
说明

appId
String
是
云音乐分配给开发者的应用ID  ，控制台上有

signType
String
是
应用生成签名字符串所使用的签名算法类型，目前支持RSA_SHA256

sign
String
是
请求参数的签名串，签名生成方式详见RSA加密

timestamp
Long
是
UNIX时间戳，毫秒级

bizContent
String
是
请求参数的集合，json格式化后需要encode，最大长度不限，除公共参数外所有业务请求参数都必须放在这个参数中传递，具体参照各Api文档

accessToken
String
否（按接口要求传）
登录令牌 ，匿名和二维码登录接口不需要，其他接口必传。匿名登录时，每台设备需生成唯一的accessToken

device
String
是
设备信息，json格式化后需要encode

accessToken至少要保留512个字符空间，且支持base64 字符集(数字、大小写字母、+、/、=)
device设备信息

参数名
类型
必选
说明

channel
String
是
厂商标识，由云音乐分配，需线下联系云音乐同事确认

deviceId
String
是
设备唯一Id（每台设备需保持唯一，可传sn、mac、IMEI、vin、iccid等值）

deviceType
String
是
设备类型，需线下联系云音乐产品确认

appVer
String
是
客户端版本号（自研的云音乐版本号）

os
String
是
操作系统类型，由云音乐分配，需线下联系云音乐同事确认

osVer
String
是
操作系统版本（ 车机系统，如：8.1.0）

brand
String
是
品牌，需线下联系云音乐同事确认

model
String
是
设备型号（车型、产品型号）

clientIp
String
是
终端IP，设备调用接口时的IP地址

netStatus
String
是
网络状态，wifi/2g/3g/4g/5g

flowFlag
String
否
是否初始化，默认：init，该字段决定本次请求是否被计算成日活

deviceId：不超过64个字符，只能包含数字、字母(区分大小写)，不允许传入=、；、空格、+、|
appVer：必须是x.x.x，三段数字，"."分隔，每段不超过四位，且总长度应该小于15个字符（会影响播放记录同步）

最佳实践：{"netStatus":"4g","flowFlag":"init","channel":"netease","deviceId":"bnVsbAkwMjowMDowMDowMDowMAk5NTQ5NzA3YTg1NmE1MDY2CW51bGw=","deviceType":"andrcar","appVer":"6.0.0","os":"andrcar","osVer":"14"

…（示例/返回略，详见官方文档页）

### 公共错误码

公共错误码

code
message

200
成功

300
应用未授权当前接口

2403
缺少signType参数

2402
缺少sign参数

2404
缺少timestamp参数

2405
缺少appId参数

2406
应用未完成加密配置

2501
缺少channel参数

2502
缺少deviceId参数

2503
缺少deviceType参数

2504
缺少appVer参数

2505
缺少os参数

2506
缺少osVer参数

2507
缺少brand参数

2508
缺少model参数

401
非法参数

402
非法业务参数

1401
不支持的HTTP方法

1402
非法sign参数

1403
非法signType参数

1404
非法timestamp参数

1405
非法appId参数

1406
accessToken过期

1407
对应账号不存在或者账号被封禁，grantcode(授权码错误或者已过期)；

1408
accesstoken 无效

-444
请求太过频繁

-445
请求太过频繁

-446
请求太过频繁

-461
请求总量超限


## 用户登录API

### 获取登录二维码

获取登录二维码失败，请重试",
  "debugInfo": null,
  "data": null,
  "failData": null
}

### 轮询二维码状态

轮询二维码状态
/openapi/music/basic/oauth2/device/login/qrcode/get
1、有效期5min，只能扫一次
2、要用一个匿名token去轮询
3、accessToken、refreshToken至少要保留512个字符空间，且支持base64 字符集(数字、大小写字母、+、/、=)

请求方式：

GET/POST

公共参数：
IOT公共参数
业务参数（bizContent）：

参数名
必选
类型
说明

key
是
String
二维码的unikey

clientId
是
String
对应appId

最佳实践：

{"key":"d74de297-ea5d-4e3b-94bc-0c2e6839814d","clientId":"a3010200000000008fded78f47c1db11"}

返回参数说明

参数名
类型
说明

accessToken
AccessToken
token相关数据

status
Int
二维码状态(800:不存在或过期, 801:等待扫码, 802:授权中, 803:授权登录成功, 804:未知错误)

msg
Int
二维码状态说明

AccessToken数据

参数名
类型
说明

accessToken
String
下发的token

refreshToken
String
用于刷新的refresh token

expireTime
Long
token过期时间（秒）

备注

accessToken默认过期时间是7天，
refreshToken默认过期时间是20天

可以在到期前预判刷新，或者过期后提示刷新

返回示例
等待扫码
{
    "code":200,
    "data":{
        "accessToken":{
            "accessToken":"null",
            "refreshToken":"null",
            "expireTime":null,
            "scopes":null
        },
        "status":801,
        "msg":"等待扫码"
    },
    "message":""
}

授权中
{
    "code":200,
    "data":{
        "accessToken":{
            "accessToken":"null",
            "refreshToken":"null",
            "expireTime":null,
            "scopes":null
        },
        "status":802,
        "msg":"授权中"
    },
    "message":""
}

扫码成功
{
    "code":200,
    "data":{
        "accessToken":{
            "accessToken":"l0c2f2825b121dc0a62c695c2f892543b7e53d075f4ee780bv",
            "refreshToken":"lb1fc7343fc28398f40fd80c47b21b14b90a81571b22835a5r",
            "expireTime":604800,
            "scopes":null
        },
        "status":803,
        "msg":"扫码成功"
    },
    "message":""
}

已扫过码
{
    "code":200,
    "data":{
        "accessToken":{
            "accessToken":"null",
            "refreshToken":"null",
            "expireTime":null,
            "scopes":null
        },
        "status":800,
        "msg":"二维码不存在或过期，请刷新"
    },
    "message":""
}

如果使用实名token轮询
{
    "code":400,
    "message":"device has login success",
    "debugInfo":null,
    "data":null,
    "failData":null
}

### 回调code换取accessToken

回调code换取accessToken
/openapi/music/basic/user/oauth2/token/get/v2
用于接入H5/唤端授权登录后，拿到的临时code，来换取用户accessToken
最好服务端调用

请求方式：

GET/POST

公共参数：
IOT公共参数
业务参数（bizContent）：

参数名
必选
类型
说明

grantCode
是
string
登录code，就是回调的code

回调的code只有10分钟有效期
最佳实践：

{"grantCode":"xxxx"}

返回参数说明

参数名
类型
说明

accessToken
String
用户token

refreshToken
String
刷新token

openId
String
对于同一个接入方客户端来讲, 同一用户返回的openId是一致的（已失效）

unionId
String
对于同一个接入方来讲, 同一用户返回的unionId是一致的（已失效）

expireIn
String
有效期（秒）

accessToken、refreshToken至少要保留512个字符空间，且支持base64 字符集(数字、大小写字母、+、/、=)

返回示例
正常情况
{
    "code":200,
    "data":{
        "accessToken":"l0c2f2825b121dc0a62c695c2f892543b7e53d075f4ee780bv",
        "refreshToken":"lb1fc7343fc28398f40fd80c47b21b14b90a81571b22835a5r",
        "openId":"123",
        "unionId":"123",
        "expireIn":604800
    }
}

grantcode失效等异常情况
{
  "code": 400,
  "message": "获取accessToken失败，请确认grantCode是否有效",
  "debugInfo": "获取accessToken失败，请确认grantCode是否有效",
  "data": null,
  "failData": null
}

### H5登录&唤端登录

一、背景
移动端app等可以通过直接打开h5授权页登录或者拉起云音乐app授权登录

h5：进入【控制台】>【应用详情】，填写授权回调域名(接收授权后的临时code)

后续使用的redirectUrl必须与该地址一致或以该地址为前缀
有多个地址时，用英文;分隔，只需和其中一个地址保持一致，即为指定该回调地址
回调地址必须是公网地址

唤端：需提供安卓和ios的schemaurl给云音乐同事进行配置后才能跳转

一旦走唤端，上述h5回调地址将失效，直接由客户端解析出code

整体授权时序图：

二、接入h5&唤端授权
1. 接入授权

接入方（app或h5）拉起h5授权登录组件，唤起时需将自己的AppId、授权回调地址、端类型、随机码等信息传给组件，具体接入方式分为以下两种：

H5接入：云音乐 h5 授权页：
 https://music.163.com/st/platform/oauth/authorize?clientId=xxx&state=xxxx&clientType=xxx&redirectUrl=xxx

App唤端接入：在三方App内调用如下协议唤起云音乐 App，在云音乐App中打开授权页：

  orpheus://openurl?url=${encode(auth_h5)}   // auth_h5 见下述 h5 协议

  auth_h5：https://music.163.com/st/platform/oauth/authorize?clientId=xxx&state=xxxx&clientType=xxx&redirectUrl=xxx&schemaUrl=xxx

H5 授权页参数：

参数名
类型
必选
描述
备注

clientId
String
是
应用id
AppId

state
String
是
自定义随机字符串，会在oauth的回跳步骤带回给接入方
长度30以内，数字或字母

clientType
String
是
接入方端类型
和当前应用创建时选择的类型保持一致，大多数固定传web

redirectUrl
String
是
接入方重定向地址
重定向的http地址，控制台上填的授权回调域名为前缀或者保持一致，传参时需要进行encode()

schemaUrl
String
否
打开接入方App的schema协议 (唤端必传)

调试工具：https://st.music.163.com/g/oauth-tool

授权完成后，若在云音乐App中授权完成会直接访问：iSchema://openurl?url=encode(https://xxx.com?code=xx&state=xx)，若在云音乐App外完成授权，则直接重定向到https://xxx.com?code=xx&state=xx

二、用户授权
授权登录展示授权页，等待用户点击授权按钮进行授权，当用户点击授权按钮时会请求授权接口，该接口会生成一个临时授权凭证即授权码code，redirectUrl中会拼接code和state（与接入方传入的state一致）返回给接入方

三、用授权码code换取授权令牌accessToken
Api接口：获取用户accessToken（建议服务端调用）

返回包含 accessToken/refreshToken/unionId，其中 refreshToken 用于 accessToken 续期

四、使用accessToken获取用户基本信息（建议服务端调用）
五、accessToken续期（建议服务端调用）

错误码：
1406 accessToken过期，请重新授权登录
1407 accessToken非法
1408 账户已封禁或注销
400 参数错误

FAQ
1、获取应用信息失败：appid写错了或者clientType写错了（clientType=web）
2、授权失败：没有写redirectUrl，或与控制台不一致
3、多个授权回调地址：英文;分隔，可填域名或域名+路径+端口号

### 刷新AccessToken

刷新AccessToken
/openapi/music/basic/user/oauth2/token/refresh/v2
给用户accessToken续期，AT默认7天，RT默认20天，需要调用该接口续期
刷新逻辑：7天内可用token，7-20天可用refresh token刷新，20天后不活跃可引导用户重新登录
注意：任意接口提示token过期，则先用refresh token去刷新，如果还是提示token过期，则引导重登
1407、1408直接重登

请求方式：GET/POST

业务参数（bizContent）：

参数名
必选
类型
说明

clientId
是
String
控制台上的appId

clientSecret
是
String
控制台上的appSecret

refreshToken
是
String
token对应的refreshToken

返回参数说明

参数名
类型
说明

accessToken
String
下发的token

refreshToken
String
用于刷新的refresh token

expiresTime
Long
token过期时间（秒）

AT和RT会同时刷新续期

token异常时：
1406 accessToken过期，或者refresh Token过期
1407 对应账号不存在或者账号被封禁
1408 accesstoken 无效
### 获取用户基本信息（续）

/openapi/music/basic/user/profile/get/v2

返回参数说明

参数名
类型
说明

id
String
用户Id

nickname
String
用户昵称

avatarUrl
String
头像

gender
String
性别,  未知： 0;  男：1;   女：2;

signature
String
签名

redVipLevel
int
黑胶会员等级

vipDetail
List<VipOpenDetailDto>
当前生效的vip类型

fullVipDetail
List<FullVipOpenDetailDto>
所有vip类型（包含已过期的会员类型）

VipOpenDetailDto type 值说明：
1 音乐包会员/畅听会员；6 黑胶VIP会员；15 黑胶SVIP会员；13 车载端会员；16 手表端会员；17 TV端会员；18 音箱端会员
svip=车载端+音箱端+tv端+手表端+黑胶会员+大部分数字专辑（各端会员为运营活动赠送，不可购买）

返回示例（正常用户）
{
   "code": 200,
   "data": {
    "id": "ED048AA6F4BA798A2874090498E38416",
    "nickname": "热心市民_Potter",
    "avatarUrl": "http://p1.music.126.net/...",
    "gender": 1,
    "signature": "我爱夏天~",
    "vipDetail": [{ "type": 6, "expireTime": 1806681599000 }],
    "redVipLevel": 6
   }
}

匿名用户返回 data: null；token 过期返回 code 1406

### 匿名登录

匿名登录
/openapi/music/basic/oauth2/login/anonymous
获取设备的匿名token（游客模式：不需要用户登录即可使用部分功能）
deviceId 唯一则自动生成唯一匿名 token（永不过期）

业务参数：clientId（=appId）

返回：accessToken（永不过期）/refreshToken/expireTime

### 查询用户是否实名

/openapi/music/basic/user/id/info（需 accessToken）

返回：userId（明文用户id）、anonymous（是否匿名用户）


## 推荐-歌曲类API

### 每日推荐

/openapi/music/basic/recommend/songlist/get/v2
需用户实名登录（匿名也可以，有默认数据）
参数：limit（建议30，最大40）、qualityFlag

返回 Records 列表字段：id/name/duration/artists/album/playFlag/downloadFlag/payPlayFlag/payDownloadFlag/vipFlag/vipPlayFlag/liked/maxBrLevel/plLevel/dlLevel/coverImgUrl…

### 获取相似歌曲（新）

/openapi/music/song/simulation/get
参数：songId（必）、limit（默认1，≤30）

返回：id/name/duration/albumName/albumId/artistName/coverImgUrl/mvId/playUrl/playFlag/payPlayFlag/vipFlag/freeTrailFlag/liked…

### 心动模式

前提（含匿名用户）：有红心歌单且红心歌单内有红心歌曲
/openapi/music/basic/song/play/intelligence/get
参数：playlistId/songId/type=fromPlayAll/startMusicId/count

返回字段同相似歌曲（含 plLevel/dlLevel 等）


## 推荐-歌单类API

### 获取榜单列表

/openapi/music/basic/toplist/get/v2

返回 Records 列表：id/name/coverImgUrl/describe/creatorNickName/playCount/subscribedCount/tags/createTime/subed/trackCount/specialType/category/updateFrequency

category 取值：
OFFICIAL 官方榜 / FEATURE 精选榜 / MUSIC_STYLE 曲风榜 / GLOBAL 全球榜 / MORE 特色榜 / LANGUAGE 语种榜 / TOPPING 置顶榜

### 获取推荐歌单列表

/openapi/music/basic/recommend/playlist/get
需用户匿名或实名登录；算法接口每次请求都会重推，单次不超过100
参数：limit（建议20）、offset

返回：id/name/describe/coverImgUrl/creatorNickName/playCount/subscribedCount/tags/createTime/subed

### 获取雷达歌单

/openapi/music/basic/playlist/radar/get
基于历史口味和实时偏好，为每位用户每天生成完全个性化的歌单（同一“雷达”每人歌曲不同）
需要用户实名登录，否则拿到的是默认数据
参数：originalCoverFlag（无水印封面，默认false）
### 获取雷达歌单（续）

返回：id/name/coverImgUrl/describe/creatorNickName/playCount/subscribedCount/tags/createTime/subed/trackCount


## 歌单广场API

### 获取歌单标签

/openapi/music/basic/playlist/tag/get/v2
获取全量的歌单标签列表，大概70个

返回 Records 列表：id/name/category
category 取值：0 语种 / 1 风格 / 2 场景 / 3 情感 / 4 主题

示例：[{"name":"华语","category":0},{"name":"欧美","category":0},{"name":"日语","category":0}…]

### 根据标签获取歌单

/openapi/music/basic/playlist/oftag/get/v2
参数：tag（必）、limit（默认10，建议30）、offset（默认0）
单个标签获取到的歌单总数不要超过300，否则会重复

返回：hasMore + records 列表（id/name/coverImgUrl/describe/creatorNickName/playCount/subscribedCount/tags/createTime/subed/trackCount/specialType…）


## 查询歌曲API

### 批量获取歌曲信息

/openapi/music/basic/song/list/get/v2
该接口拿不到播放地址，需要单独查
参数：songIdList（≤500个，JSON String）、qualityFlag

返回：id/name/duration/visible(是否有版权)/playFlag/downloadFlag/payPlayFlag/payDownloadFlag/coverImgUrl/artists…


### 获取歌词

/openapi/music/basic/song/lyric/get/v2（逐行歌词）
参数：songId

返回：songId/lyric（原版逐行歌词）/noLyric（纯音乐无歌词）/transLyric（翻译歌词）/txtLyric（非滚动歌词）


### 获取歌曲详情

/openapi/music/basic/song/detail/get/v2
1、该接口可以拿到播放地址
2、默认最高到 hires；高品质需配置（appid 全量开通或 extFlags={"hqScene":"normal"}）；vivid 需单独配置

参数：
songId（必）、withUrl（必）、bitrate（128标准/320极高/999无损/1999Hi-Res，默认用户可收听最大码率）、effects（杜比：eac3/ac4）、qualityFlag、level（vivid/dolby/sky/jymaster/jyeffect/hires/lossless/exhigh/standard）、immerseType（sky 必传：c51/ste/aac）、languageFlag、extFlags

优先级：杜比全景声 > 沉浸环绕声 > 超清母带 > 高清臻音 > hires > 无损 > 极高 > 标准
传了 effects 以 effects 为主；没有杜比则看 level 再看 bitrate，枚举匹配不到指定音质才自动降级


## 私人漫游API

### 获取私人漫游场景歌曲

/openapi/music/basic/private/fm/roaming/song/list
参数：type（必，来自 roaming/category）、code（必，来自 roaming/category）、limit（固定每次取3）、withPlayUrl（默认false）、unplaySongIds（上次未播放歌曲列表，用于提升推荐效果）
最好登录使用，匿名用户不保证数据完整性


## 日推MIX

### 日推mix

/openapi/music/basic/recommend/daily/mix
根据用户听歌喜好推荐主体场景，默认前两个是日推和私人漫游，兜底6个卡片

返回 blocks 列表：title/subTitle/simplifiedTitle/imageInfo{url,onImageIconUrl}/resourceId/resourceType/extData

resourceType 对照：
daily_song_rec 每日推荐 → /openapi/music/basic/recommend/songlist/get/v2
fm 私人漫游 → /openapi/music/basic/private/fm/roaming/s…


## 附：本站实际使用的 Web 端接口对照笔记

| 能力 | 本站调用（服务端 netEase.ts） | 说明 |
|---|---|---|
| 搜索 | GET /api/search/get/web?s=&type=1/100/1000 | 明文 web api |
| 歌词 | GET /api/song/lyric?id=&lv=1 | 明文 web api |
| 播放地址 | POST /weapi/song/enhance/player/url/v1 | weapi 加密（AES+RSA） |
| 榜单 | GET /api/toplist | 明文 |
| 歌单详情 | POST /weapi/v6/playlist/detail | weapi |
| 歌曲详情批量 | POST /weapi/v3/song/detail | weapi |
| 歌手 | GET /api/v1/artist/{id}、/api/artist/top | 明文 |
| 推荐歌单/新歌 | POST /weapi/personalized/playlist、/weapi/personalized/newsong | weapi |
| 热搜 | POST /weapi/search/hot | weapi |
| 扫码登录 | POST /api/login/qrcode/unikey、/api/login/qrcode/client/login（type:3，明文 form） | 与 NeteaseCloudMusicApi 一致 |
| 每日推荐 | POST /weapi/v3/discovery/recommend/songs | weapi，需 MUSIC_U |
| 私人FM | POST /weapi/v1/radio/get | weapi，需 MUSIC_U |
| 用户歌单 | POST /weapi/user/playlist | weapi，需 MUSIC_U |
| 收藏专辑 | POST /weapi/album/sublist | weapi，需 MUSIC_U |
| 专辑详情 | POST /weapi/v1/album/{id} | weapi |

- 开放平台 openapi 二维码登录：/openapi/music/basic/user/oauth2/qrcodekey/get/v2（type=2, expiredKey=300）→ /openapi/music/basic/oauth2/device/login/qrcode/get（key+clientId，5min 有效只能扫一次）→ 返回 accessToken/refreshToken（OAuth2）。**需 appId/签名，个人项目不可用**，故登录采用 weapi 体系。
- 注意状态码对照（openapi 轮询）：800 不存在或过期 / 801 等待扫码 / 802 授权中 / 803 授权登录成功 / 804 未知错误
