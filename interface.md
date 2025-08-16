<h1 style="text-align: center; border: none;">后端接口说明</h1>

# 聊天相关接口

### 接口：聊天接口

### Request

- 地址: `/api/chat`
- 类型：`POST`
- Content-Type: `application/json`
- Body：


  | key             | value类型    | 说明           |
  | --------------- | ------------ | -------------- |
  | message         | string       | 用户的提问消息 |
  | username        | string       | 用户名         |
  | conversation_id | string       | 会话的id       |
  | file_ids        | List[string] | 上传的文件的id |

### Response

- 类型：StreamingResponse
- StreamChunk：


  | 消息类型                   | 起始标志     |
  | -------------------------- | ------------ |
  | 正常回答                   | 无           |
  | 内部错误                   | [ERROR]      |
  | 回复完成，给出整个消息的id | [MESSAGE_ID] |
- 示例：

  ```typescript
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let accumulatedContent = ""
  let messageId: string | undefinedwhile(true)
  {
      const { done, value } = await reader.read()
      if (done) { break }

      let chunk = decoder.decode(value, { stream: true })
      if (chunk.startsWith("[ERROR]")) 
      {
          setMessages((prev) =>
            prev.map((msg, index) =>
              index === prev.length - 1
                ? {
                    ...msg,
                    content: chunk,
                    isStreaming: false,
                  }
                : msg,
            ),
          )
          break
      }
      // 检查并提取messageId，但不将其添加到显示内容中
      if (chunk.includes("[MESSAGE_ID:")) 
      {
          const match = chunk.match(/\[MESSAGE_ID:([^\]]+)\]/)
          if (match) 
          {
               messageId = match[1]
               // 从chunk中移除MESSAGE_ID标记，避免显示在消息内容中
               chunk = chunk.replace(/\[MESSAGE_ID:[^\]]+\]/g, "")
          }
       }
       // 只有在chunk不为空时才添加到内容中
       if (chunk.trim()) 
       {
           accumulatedContent += chunk
       }
  }
  ```

---

### 接口：文件上传

### Request

- 地址：`/api/file/upload`
- 类型：`POST`
- Content-Type: `multipart/form-data`
- Body：


  | key                 | value类型        | 说明       |
  | ------------------- | ---------------- | ---------- |
  | files (files部分)   | List[UploadFile] | 上传的文件 |
  | username (form部分) | string           | 用户名     |

### Response

- 类型：`JSONResponse`
- 字段：


  | key      | value 类型   | 说明                 |
  | -------- | ------------ | -------------------- |
  | file_ids | List[string] | 上传成功的文件ID列表 |

---

### 接口：获取下一个问题建议

### Request

- 地址：`/api/chat/next_suggest/{message_id}?username=xxx `
- 类型：`GET`
- Content-Type: `application/json`

### Response

- 类型：`JSONResponse`
- 字段：


  | key             | value 类型   | 说明           |
  | --------------- | ------------ | -------------- |
  | data            | List[string] | 建议的问题列表 |
  | error(仅错误时) | string       | 错误消息       |

---

### 接口：获取用户会话列表

### Request

- 地址：`/api/conversations/list/{username}`
- 类型：`GET`
- Content-Type: `application/json`

### Response

- 类型：`JSONResponse`
- 字段：


  | key           | value 类型             | 说明     |
  | ------------- | ---------------------- | -------- |
  | conversations | List[ConversationDict] | 会话列表 |


  - ConversationDict结构：


    | key        | value 类型 | 说明            |
    | ---------- | ---------- | --------------- |
    | id         | string     | 会话ID          |
    | name       | string     | 会话名称        |
    | created_at | string     | 创建时间（ISO） |
    | updated_at | string     | 更新时间（ISO） |

---

### 接口：获取某个会话的历史消息

### Request

- 地址：`/api/conversations/{conversation_id}/history?username=xxx `
- 类型：`GET`
- Content-Type: `application/json`

### Response

- 类型：`JSONResponse`
- 字段：


  | key  | value 类型        | 说明         |
  | ---- | ----------------- | ------------ |
  | data | List[MessageDict] | 历史消息列表 |


  - MessageDict结构(一个Dict为一条消息)：


    | key           | value 类型     | 说明                   |
    | ------------- | -------------- | ---------------------- |
    | query         | string         | 用户提问               |
    | answer        | string         | AI回答                 |
    | message_files | List[FileDict] | 一条消息含有的文件信息 |
    | created_at    | string         | 消息创建时间（ISO）    |


    - FileDict结构


      | key        | value类型 | 说明                             |
      | ---------- | --------- | -------------------------------- |
      | id         | string    | 文件的id                         |
      | type       | string    | 文件类型，'image'图片            |
      | url        | string    | 文件预览url地址                  |
      | belongs_to | string    | 文件归属方，'user'\| 'assistant' |

---

### 接口：删除会话

### Request

- 地址：`/api/conversations/{conversation_id}/delete?username=xxx`
- 类型：`DELETE`
- Content-Type： `application/json`

### Response

- 类型：`JSONResponse`
- 字段：


  | key             | value类型 | 说明         |
  | --------------- | --------- | ------------ |
  | message         | string    | 操作结果消息 |
  | conversation_id | string    | 删除的会话ID |
  | error(仅失败时) | string    | 错误信息     |

---

# 用户管理相关接口

### 接口：用户注册

### Request

- 地址：`/api/user/register`
- 类型：`POST`
- Content-Type: `multipart/form-data`
- Body：


  | key      | value类型 | 说明     |
  | -------- | --------- | -------- |
  | username | string    | 用户名   |
  | password | string    | 用户密码 |

### Response

- 类型：`JSONResponse`
- 字段：


  | key              | value类型 | 说明         |
  | ---------------- | --------- | ------------ |
  | message          | string    | 操作完成消息 |
  | detail(仅失败时) | string    | 操作失败消息 |

---

### 接口：用户登录

### Request

- 地址：`/api/user/login`
- 类型：`POST`
- Content-Type: `application/json`
- Body：


  | key      | value类型 | 说明     |
  | -------- | --------- | -------- |
  | username | string    | 用户名   |
  | password | string    | 用户密码 |

### Response

- 类型：`JSONResponse`
- 字段：


  | key              | value类型 | 说明         |
  | ---------------- | --------- | ------------ |
  | message          | string    | 操作完成消息 |
  | detail(仅失败时) | string    | 操作失败消息 |
