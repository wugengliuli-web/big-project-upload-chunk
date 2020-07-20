<template>
  <div class="progress-wrapper">
    <span class="file-name">{{ fileName }}</span>
    <el-progress
      :text-inside="true"
      :stroke-width="26"
      :percentage="percentage"
      :status="status"
    ></el-progress>
    <i @click="confim" :class="iconClass"></i>
  </div>
</template>

<script>
export default {
  props: {
    percentage: {
      required: true,
      type: Number,
    },
    status: {
      required: true,
      type: String,
    },
    index: {
      required: true,
      type: Number,
    },
    fileName: {
      required: true,
      type: String,
    },
  },
  computed: {
    confim() {
      let fn;
      switch (this.status) {
        case "success":
          fn = () => {};
          break;
        case "warning":
          fn = () => {
            this.$emit("play", this.index);
          };
          break;
        default:
          fn = () => {
            this.$emit("pause", this.index);
          };
          break;
      }
      return fn;
    },
    iconClass() {
      let iconClass = "icon ";
      switch (this.status) {
        case "success":
          iconClass += "el-icon-success";
          break;
        case "warning":
          iconClass += "el-icon-video-play";
          break;
        default:
          iconClass += "el-icon-video-pause";
          break;
      }
      return iconClass;
    },
  },
};
</script>

<style scoped>
.progress-wrapper {
  display: flex;
  align-items: center;
  margin: 10px 0;
}
.icon {
  margin-left: 10px;
  cursor: pointer;
  font-size: 25px;
}
.el-progress {
  width: 80%;
}
.el-icon-success {
  color: #67c23a;
}
.el-icon-video-pause {
  color: #409eff;
}
.el-icon-video-play {
  color: #e6a23c;
}
.file-name {
  font-size: 12px;
  margin-right: 10px;
}
</style>
