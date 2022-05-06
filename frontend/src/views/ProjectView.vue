<template>
  <splitpanes class="default-theme" vertical style="height: 100vh">
    <pane style="overflow-y: auto" size="12">
      <file-list :id="id" @selected="onFileSelected"></file-list>
    </pane>
    <pane style="overflow-y: auto">
      <latex-editor :id="id" ref="editor"></latex-editor>
    </pane>
    <pane style="overflow-y: auto"> </pane>
  </splitpanes>
</template>

<script>
import { Splitpanes, Pane } from "splitpanes";
import "splitpanes/dist/splitpanes.css";
import FileList from "../components/FileList.vue";
import LatexEditor from "../components/LatexEditor.vue";

export default {
  name: "ProjectView",
  components: {
    Splitpanes,
    Pane,
    FileList,
    LatexEditor,
  },
  computed: {
    id() {
      return this.$route.params.id;
    },
  },
  methods: {
    onFileSelected(file) {
      this.$refs.editor.changeFile(file);
    },
  },
};
</script>
