<template>
  <prism-editor
    @keydown.ctrl.s.prevent.stop="save"
    id="code"
    class="editor"
    v-model="code"
    :highlight="highlighter"
    line-numbers
  ></prism-editor>
</template>

<script>
//import defaultDocument from "../assets/defaultDocument";
// import Prism Editor
import { PrismEditor } from "vue-prism-editor";
import "vue-prism-editor/dist/prismeditor.min.css"; // import the styles somewhere

import Prism from "prismjs";
import "prismjs/components/prism-latex";
import "prismjs/components/prism-core";
import "prismjs/themes/prism-okaidia.css";
import { downloadFile, uploadFile } from "../services/api/client";

export default {
  components: {
    PrismEditor,
  },
  props: {
    id: {
      type: String,
      required: true,
    },
  },
  data: () => ({
    code: "",
    currentFile: undefined,
  }),
  methods: {
    highlighter(code) {
      return Prism.highlight(code, Prism.languages.latex, "latex");
    },
    async saveFile() {
      if (this.currentFile !== undefined) {
        await uploadFile(this.id, this.currentFile, this.code);
      }
    },
    async changeFile(file) {
      await this.saveFile();

      if (this.currentFile != file) {
        this.currentFile = file;
        this.code = (await downloadFile(this.id, file)).data.toString();
      } else {
        this.$emit("compile", this.currentFile);
      }
    },
    async reloadFile() {
      this.code = (await downloadFile(this.id, this.currentFile)).data;
      this.$emit("compile", this.currentFile);
    },
    save() {
      this.$emit("compile", this.currentFile);
      this.saveFile();
    },
  },
};
</script>

<style>
.editor {
  background: #1e1e1e;
  color: #e7e7e7;
  outline: none;

  font-family: Fira code, Fira Mono, Consolas, Menlo, Courier, monospace;
  line-height: 1.5;
  padding: 5px;
}
</style>
