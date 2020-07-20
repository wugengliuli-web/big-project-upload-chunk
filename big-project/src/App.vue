<template>
  <div id="app">
    <div class="btn-wrapper">
      <el-button type="primary">
        选择上传文件
        <input type="file" @change="upLoad" class="input" />
      </el-button>
    </div>
    <div class="progress">
      <Progress
        :key="item.fileName + index"
        v-for="(item, index) in fileList"
        :percentage="item.percentage"
        :status="item.status"
        @play="play"
        @pause="pause"
        :index="index"
        :fileName="item.fileName"
      />
    </div>
  </div>
</template>

<script>
import Progress from "./components/progress";
import axios from "axios";
export default {
  data() {
    return {
      fileList: [],
      size: 1024 * 200 * 1, //文件切片大小
      uploadNum: 5, //一次上传的切片数量
    };
  },
  methods: {
    fileParams(file) {
      const { name: fileName } = file;
      return {
        fileName, // 文件名
        status: "loading",  //上传状态
        percentage: 0,  //上传进度
        fileChunk: this.handleFile(file, this.size),  //文件切片
        cur: 0, //当前上传切片的位置记录
        isUpload: true, //判断是暂停还是继续上传
      };
    },
    handleFile(file, size) {
      //对文件进行切片
      const fileChunk = [];
      const { size: fileSize } = file;
      let cur = 0;
      while (cur < fileSize) {
        fileChunk.push({ file: file.slice(cur, cur + size) });
        cur += size;
      }
      return fileChunk;
    },
    upLoad(e) {
      const file = e.target.files[0];
      if(!file) return
      const { name } = file;
      if (!this.isMp3(name)) {
        this.errMsg("上传格式错误");
      }
      if(this.hasUpload(name)) {
        this.errMsg('已在上传队列中');
        return
      }
      const params = this.fileParams(file);
      this.fileList.push(params);
      this.upLoadFileChunk(params)
    },
    hasUpload(fileName) {
      //判断是否上传过
      return this.fileList.some(item => item.fileName === fileName)
    },
    isMp3(fileName) {
      return /.*\.mp3$/.test(fileName);
    },
    errMsg(msg) {
      this.$message.error(msg);
    },
    play(index) {
      //继续上传
      this.fileList[index].isUpload = true
      this.fileList[index].status = 'loading'
      this.setPercentage(this.fileList[index])
      this.upLoadFileChunk(this.fileList[index])
    },
    pause(index) {
      //暂停上传
      this.fileList[index].isUpload = false
      this.fileList[index].status = 'warning'
    },
    async upLoadFileChunk(params) {
      const { fileName, fileChunk } = params;
      //首先查询上传了多少了
      const res = await this.getFileListPercentage({ fileName, fileChunkLen: fileChunk.length })
      //已经上传完成的不用上传
      const { percentage, cur } = res.data
      params.percentage = percentage
      params.cur = cur
      if(cur === fileChunk.length) {
        //如果上传完成
        params.status = 'success'
        return
      }
      //上传文件切片
      const uploadChunk = fileChunk.map((item, index) => ({
        file: item.file,
        hashName: `${fileName}-${index}`,
        fileName: fileName
      }));
      const fdChunk = uploadChunk.map((item) => {
        const fd = new FormData();
        fd.append("fileName", item.fileName);
        fd.append("hashName", item.hashName);
        fd.append('file', item.file)
        return fd;
      });
      const len = fdChunk.length;
      while (params.cur < len) {
        //如果状态不是继续上传，就直接退出
        if(!params.isUpload) return
        
        const uploadActionChunk = fdChunk
          .slice(params.cur, params.cur + this.uploadNum)
          .map((item) => this.uploadAction(item));
        params.cur += this.uploadNum;
        await Promise.all(uploadActionChunk).then(() => {
          if(params.isUpload) {
            this.setPercentage(params)
          }
        });
      }
      //全部发送完成，发送合并切片的请求
      await this.mergeRequest(fileName)
      params.percentage = 100;
      params.status = "success";
    },
    setPercentage(params) {
      const { fileChunk } = params;
      const len = fileChunk.length
      params.percentage = Math.floor((params.cur / len) * 100);
      if (params.percentage >= 100) {
        params.percentage = 99;
      }
    },
    uploadAction(fd) {
      //上传操作
      return axios.post("http://localhost:4000/v1/postFileChunk", fd);
    },
    mergeRequest(fileName) {
      return axios.post("http://localhost:4000/v1/mergeRequest", {
        fileName
      })
    },
    getFileListPercentage(query) {
      return axios.get("http://localhost:4000/v1/getFileListPercentage", {
        params: {
          ...query
        }
      })
    }
  },
  components: {
    Progress,
  },
};
</script>

<style>
.el-button {
  position: relative;
}
.input {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
}
.progress {
  margin-top: 10px;
}
</style>
