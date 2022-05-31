<template>
  <div style="text-align: center">
    <b-table :items="filesItems" striped hover :fields="['name']">
      <template v-slot:cell(name)="row">
        <div @click="changeFile.call(this, row)" style="cursor: pointer">
          {{ row.item.name }}
        </div>
      </template>
    </b-table>

    <b-button v-b-modal.new-file-modal variant="success"
      >Create new file</b-button
    >
    <b-button
      class="m-md-2"
      @click="$emit('selected', this.selectedFile)"
      v-b-tooltip.hover
      title="Ctrl+S"
      >Compile</b-button
    >
    <b-modal
      centered
      id="new-file-modal"
      title="Create a new file"
      @ok="createNewFile"
    >
      <b-form-group label="File name:" label-for="fileName">
        <b-form-input
          id="fileName"
          required
          v-model="newfileName"
          placeholder="Enter a file name..."
        ></b-form-input>
      </b-form-group>
    </b-modal>
  </div>
</template>

<script>
import { listFiles, uploadFile } from "../services/api/client.js";

export default {
  props: {
    id: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      files: [],
      newfileName: "",
      selectedFile: "",
    };
  },
  computed: {
    filesItems() {
      return this.files.map((file) => {
        return {
          name: file,
          _rowVariant: file === this.selectedFile ? "primary" : "",
        };
      });
    },
  },
  mounted() {
    this.loadFiles();
  },
  methods: {
    changeFile(row) {
      this.$emit("selected", row.item.name);
      this.selectedFile = row.item.name;
    },
    async loadFiles() {
      let isFirst = false;
      if (this.files.length === 0) {
        isFirst = true;
      }
      this.files = (await listFiles(this.id)).data.files.sort();

      if (isFirst) {
        this.$emit("selected", this.files[0]);
        this.selectedFile = this.files[0];
      }
    },
    async createNewFile() {
      if (!this.newfileName.startsWith("/")) {
        this.newfileName = "/" + this.newfileName;
      }

      await uploadFile(
        this.id,
        this.newfileName,
        `\\documentclass[12pt]{scrartcl}
\\usepackage[utf8]{inputenc}
   
\\title{Title}
\\author{Author}
\\date{\\today}
    
\\begin{document}
  \\maketitle
  \\begin{center}
    \\LaTeX is \\textit{sus}!
  \\end{center}
\\end{document}`
      );
      this.$emit("selected", this.newfileName);
      this.selectedFile = this.newfileName;
      await this.loadFiles();
    },
  },
};
</script>
