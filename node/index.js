const express = require("express");
const cors = require("cors");
const app = express();
const bodyParser = require("body-parser");
const multiparty = require("multiparty");
const fs = require("fs");
const path = require("path");
const fileSaveChunkPath = path.resolve(__dirname, "saveFile"); //保存切片的目录
const fileSavePath = path.resolve(__dirname, "file"); //保存文件的目录
app.use(
  cors({
    origin: "*",
    optionsSuccessStatus: 200,
  })
);

app.use(bodyParser.json());

app.get("/v1/getFileListPercentage", async (req, res) => {
  const {
    query: { fileName, fileChunkLen },
  } = req;
  const len = Number.parseInt(fileChunkLen);
  //首先检查保存好的目录是否含有该文件
  const hasSaveFileComputed = checkFile(path.resolve(fileSavePath, fileName));
  if (hasSaveFileComputed) {
    //如果含有，返回进度100%
    res.json({
      code: 0,
      percentage: 100,
      cur: len,
    });
    return;
  }
  //如果保存好的目录没有，代表没有上传完成或者没有上传
  //去获取已经上传了多少
  const hasSaveFileChunk = checkFile(path.resolve(fileSaveChunkPath, fileName));
  if (!hasSaveFileChunk) {
    //如果没有切片目录，代表还没上传
    res.json({
      code: 0,
      percentage: 0,
      cur: 0,
    });
    return;
  }
  const cur = fs.readdirSync(path.resolve(fileSaveChunkPath, fileName)).length;
  res.json({
    code: 0,
    cur,
    percentage: Math.floor((cur / len) * 100),
  });
});

app.post("/v1/postFileChunk", async (req, res) => {
  const form = new multiparty.Form();
  form.parse(req, async (err, fields, files) => {
    if (err) {
      return;
    }
    const [fileName] = fields.fileName;
    const [hashName] = fields.hashName;
    const [file] = files.file;
    await saveFile(fileSaveChunkPath, fileName, hashName, file);
    //模拟上传时间
    setTimeout(() => {
      res.json({
        code: 0,
      });
    }, 1000);
  });
});

app.post("/v1/mergeRequest", async (req, res) => {
  //进行切片的合并
  const {
    body: { fileName },
  } = req;
  const filePath = path.resolve(fileSaveChunkPath, fileName);
  const reg = /.*-(.*)$/i;
  //对分片排序
  const dirFile = fs.readdirSync(filePath).sort((a, b) => {
    const [, matchA] = reg.exec(a);
    const [, matchB] = reg.exec(b);
    return Number.parseInt(matchA) - Number.parseInt(matchB);
  });
  const fileChunkDataPro = dirFile.map((item) => readFile(filePath, item));
  //删除保存切片的文件
  delDir(path.resolve(fileSaveChunkPath, fileName));
  const fileChunkData = await Promise.all(fileChunkDataPro);
  await writeStream(fileSavePath, fileName, fileChunkData);
  res.send({
    code: 0,
  });
});

//删除目录
function delDir(path) {
  let files = [];
  if (fs.existsSync(path)) {
    files = fs.readdirSync(path);
    files.forEach((file, index) => {
      let curPath = path + "/" + file;
      if (fs.statSync(curPath).isDirectory()) {
        delDir(curPath); //递归删除文件夹
      } else {
        fs.unlinkSync(curPath); //删除文件
      }
    });
    fs.rmdirSync(path);
  }
}

//检测文件目录是否存在
function checkFile(path) {
  const fn = fs.existsSync(path);
  return fn;
}

//保存文件
async function saveFile(pathName, fileName, hashName, file) {
  const newPath = path.resolve(pathName, fileName);
  if (!checkFile(newPath)) {
    //如果目录不存在，先创建目录
    await mkdir(pathName, fileName);
  }
  await saveFileAction(newPath, hashName, file);
}

async function saveFileAction(pathName, fileName, file) {
  return new Promise((res, rej) => {
    const { path: filePath } = file
    const data = fs.readFileSync(filePath)
    fs.writeFile(path.resolve(pathName, fileName), data, (err) => {
      if (err) rej(err);
      res();
    });
  });
}

//创建目录
function mkdir(filePath, dirName) {
  const newPath = path.resolve(filePath, dirName);
  if(checkFile(newPath)) return 
  return new Promise((res, rej) => {
    fs.mkdir(path.resolve(filePath, dirName), (err) => {
      if (err) rej(err);
      res();
    });
  });
}

function readFile(pathName, fileName) {
  return new Promise((res, rej) => {
    fs.readFile(path.resolve(pathName, fileName), {}, (err, data) => {
      if (err) rej(err);
      res(data);
    });
  });
}

async function writeStream(pathName, fileName, fileChunkData) {
  return new Promise((res, rej) => {
    const len = fileChunkData.reduce((prev, cur) => prev + cur.length, 0);
    const ws = fs.createWriteStream(path.resolve(pathName, fileName));
    ws.on("finish", () => {
      res();
    });
    const fileData = Buffer.concat(fileChunkData, len);
    ws.write(fileData);
    ws.end();
  });
}

app.listen(4000, () => {
  console.log("开启监听");
});
