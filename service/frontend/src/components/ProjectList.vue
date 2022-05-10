<template>
  <div class="container p-4">
    <b-button v-b-modal.new-project-modal>New Project</b-button>
    <b-modal
      centered
      id="new-project-modal"
      title="Create a new project"
      @ok="createNewProject"
    >
      <b-form-group label="Project name:" label-for="projectName">
        <b-form-input
          id="projectName"
          required
          v-model="newProjectName"
          placeholder="Enter a project name..."
        ></b-form-input>
      </b-form-group>
    </b-modal>
    <b-table
      :items="projects"
      :fields="['name']"
      selectable
      show-empty
      striped
      hover
    >
      <template v-slot:cell(name)="row">
        <div
          @click="$router.push('/project/' + row.item.id)"
          style="cursor: pointer"
        >
          {{ row.item.name }}
        </div>
      </template>
    </b-table>
  </div>
</template>

<script>
import { listProjects, createProject } from "../services/api/client.js";

export default {
  name: "ProjectList",
  data() {
    return {
      projects: [],
      newProjectName: "",
    };
  },
  mounted() {
    this.loadProjects();
  },
  methods: {
    async loadProjects() {
      this.projects = (await listProjects()).data.projects;
    },
    async createNewProject() {
      await createProject(this.newProjectName);
      this.loadProjects();
    },
  },
};
</script>
