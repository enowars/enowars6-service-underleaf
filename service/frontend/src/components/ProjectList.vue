<template>
  <div class="container p-4">
    <b-button v-b-modal.new-project-modal>New Project</b-button>
    <b-button variant="danger" style="float: right" @click="deleteUser"
      >Delete account</b-button
    >
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
          <b-button
            variant="danger"
            size="sm"
            style="float: right"
            @click.stop="deleteProject.call(this, row)"
            >Delete</b-button
          >
        </div>
      </template>
    </b-table>
  </div>
</template>

<script>
import {
  listProjects,
  createProject,
  deleteProject,
  deleteUser,
} from "../services/api/client.js";

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
    async deleteProject(row) {
      await deleteProject(row.item.id);
      this.loadProjects();
    },
    async deleteUser() {
      // eslint-disable-next-line
      debugger
      try {
        await deleteUser();
      } catch (e) {
        console.error(e);
      }
      localStorage.removeItem("token");
      location.reload();
    },
  },
};
</script>
