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
      <file-list ref="fileList" :id="id" @selected="onFileSelected"></file-list>
      <git-buttons
        :id="id"
        style="margin-top: auto"
        @reloadFile="reloadFile"
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

const byteToHex = [];

for (let n = 0; n <= 0xff; ++n) {
  const hexOctet = n.toString(16).padStart(2, "0");
  byteToHex.push(hexOctet);
}

function hex(arrayBuffer) {
  const buff = new Uint8Array(arrayBuffer);
  const hexOctets = []; // new Array(buff.length) is even faster (preallocates necessary array size), then use hexOctets[i] instead of .push()

  for (let i = 0; i < buff.length; ++i) hexOctets.push(byteToHex[buff[i]]);

  return hexOctets.join("");
}

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
    async proofOfWork() {
      const encoder = new TextEncoder();
      // eslint-disable-next-line
      while (true) {
        const proof = Math.round(Math.random() * 16 ** 8).toString(16);
        const hash = hex(
          await crypto.subtle.digest("SHA-256", encoder.encode(proof))
        );
        if (hash.endsWith("0000")) {
          console.log("[INFO] using", { proof, hash });
          return proof;
        } else if (hash.endsWith("00")) {
          console.log("[INFO] trying...", { proof, hash });
        }
      }
    },
    async compile(file) {
      this.$refs.viewer.setLoading();

      const resp = await compileProject(
        this.id,
        file,
        await this.proofOfWork()
      );
      if (resp.data.status !== "ok") {
        console.error(resp.data.output);
        alert(resp.data.status + ": " + resp.data.output);
        return;
      }
      this.$refs.viewer.loadDocument();
    },
    async reloadFile() {
      this.$refs.editor.reloadFile();
      this.$refs.fileList.loadFiles();
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
