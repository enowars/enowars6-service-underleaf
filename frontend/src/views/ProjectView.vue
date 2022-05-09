<template>
  <splitpanes class="default-theme" vertical style="height: 100vh">
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
      <pdf-viewer :src="pdfUrl" ref="viewer"></pdf-viewer>
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
    async compile(file) {
      this.$refs.viewer.setLoading();
      const resp = await compileProject(this.id, file);
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
  },
};
</script>

<style>
body {
  overflow: hidden;
}
</style>
