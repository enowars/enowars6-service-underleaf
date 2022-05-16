<template>
  <splitpanes
    class="default-theme"
    vertical
    style="height: 100vh"
    @resize="onResizeStart"
    @resized="onResizeEnd"
  >
    <pane
      style="
        overflow-y: auto;
        text-align: center;
        display: flex;
        flex-direction: column;
      "
      size="12"
    >
      <file-list :id="id" @selected="onFileSelected"></file-list>
      <git-buttons
        :id="id"
        style="margin-top: auto"
        @reloadFile="realoadFile"
      ></git-buttons>
    </pane>
    <pane style="overflow-y: auto">
      <latex-editor :id="id" ref="editor" @compile="compile"></latex-editor>
    </pane>
    <pane style="overflow-y: auto">
      <pdf-viewer :id="id" ref="viewer"></pdf-viewer>
    </pane>
  </splitpanes>
</template>

<script>
import { Splitpanes, Pane } from "splitpanes";
import "splitpanes/dist/splitpanes.css";
import FileList from "../components/FileList.vue";
import LatexEditor from "../components/LatexEditor.vue";
import PdfViewer from "../components/PdfViewer.vue";
import { compileProject } from "../services/api/client";
import GitButtons from "../components/GitButtons.vue";

export default {
  name: "ProjectView",
  components: {
    Splitpanes,
    Pane,
    FileList,
    LatexEditor,
    PdfViewer,
    GitButtons,
  },
  computed: {
    id() {
      return this.$route.params.id;
    },
    pdfUrl() {
      return `/api/latex/output/${this.id}`;
    },
  },
  methods: {
    async onFileSelected(file) {
      this.$refs.editor.changeFile(file);
      await this.compile(file);
    },
    countZeroInUint32(x) {
      let n = 32;
      let y = 0;

      y = x >> 16;
      if (y != 0) {
        n = n - 16;
        x = y;
      }
      y = x >> 8;
      if (y != 0) {
        n = n - 8;
        x = y;
      }
      y = x >> 4;
      if (y != 0) {
        n = n - 4;
        x = y;
      }
      y = x >> 2;
      if (y != 0) {
        n = n - 2;
        x = y;
      }
      y = x >> 1;
      if (y != 0) return n - 2;
      return n - x;
    },

    async proofOfWork(difficulty) {
      const msgBuffer = new Uint32Array([
        Math.floor(Math.random() * 0xffffffff),
      ]);
      // eslint-disable-next-line
      while (true) {
        const hashedArray = await crypto.subtle.digest("SHA-256", msgBuffer);
        const hashed = new Uint32Array(hashedArray);
        // count the number of leading zeros
        let count = 0;
        inner: for (let i = 0; i < hashed.byteLength; i++) {
          if (hashed[i] == 0) {
            count += 32;
          } else {
            count += this.countZeroInUint32(hashed[i]);
            break inner;
          }
        }
        if (count >= difficulty) {
          return msgBuffer[0].toString(16);
        }
        msgBuffer[0]++;
      }
    },
    async compile(file) {
      this.$refs.viewer.setLoading();

      const resp = await compileProject(
        this.id,
        file,
        await this.proofOfWork(16)
      );
      if (resp.data.status !== "ok") {
        console.error(resp.data.output);
        alert(resp.data.status + ": " + resp.data.output);
        return;
      }
      this.$refs.viewer.loadDocument();
    },
    async realoadFile() {
      this.$refs.editor.realoadFile();
    },
    onResizeStart() {
      this.$refs.viewer.setResizing(true);
    },
    onResizeEnd() {
      this.$refs.viewer.setResizing(false);
    },
  },
};
</script>

<style>
body {
  overflow: hidden;
}
</style>
