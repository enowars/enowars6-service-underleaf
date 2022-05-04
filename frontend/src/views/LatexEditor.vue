<template>
  <splitpanes class="default-theme" vertical style="height: 100vh">
    <pane style="overflow-y: auto">
      <prism-editor
        id="code"
        class="editor"
        v-model="code"
        :highlight="highlighter"
        line-numbers
      ></prism-editor>
    </pane>

    <pane style="overflow-y: auto">
      <pdf-viewer :src="'/pdf.pdf'" ref="pdf"></pdf-viewer>
    </pane>
  </splitpanes>
</template>

<script>
import { Splitpanes, Pane } from "splitpanes";
import "splitpanes/dist/splitpanes.css";

import defaultDocument from "../assets/defaultDocument";

// import Prism Editor
import { PrismEditor } from "vue-prism-editor";
import "vue-prism-editor/dist/prismeditor.min.css"; // import the styles somewhere

import Prism from "prismjs";
import "prismjs/components/prism-latex";
import "prismjs/components/prism-core";
import "prismjs/themes/prism-okaidia.css";
import PdfViewer from '../components/PdfViewer.vue';



export default {
  components: {
    PrismEditor,

    Splitpanes,
    Pane,

    PdfViewer,
  },
  data: () => ({
    code: defaultDocument,
    numPages: 0,
  }),
  methods: {
    highlighter(code) {
      return Prism.highlight(code, Prism.languages.latex, "latex");
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
body {
  padding: 0px;
  margin: 0px;
  overflow: hidden;
}
</style>