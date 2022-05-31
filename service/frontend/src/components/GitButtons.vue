<template>
  <div>
    <b-modal centered id="commit-message-modal" title="Commit" @ok="commit">
      <b-form-group label="Commit message:" label-for="commitMessage">
        <b-form-input
          id="commitMessage"
          required
          v-model="commitMessage"
          placeholder="Enter a commit message..."
        ></b-form-input>
      </b-form-group>
    </b-modal>

    <ul class="git-button-list">
      <li>
        <b-button variant="success" v-b-modal.commit-message-modal
          >→ Commit</b-button
        >
      </li>
      <li><b-button variant="primary" @click="push">↑ Push</b-button></li>
      <li><b-button variant="warning" @click="pull">↓ Pull</b-button></li>
      <li>
        <b-button variant="dark" @click="clone" v-b-tooltip.hover
      title="Copys the url to clone this project via git">→ Copy remote url</b-button>
      </li>
    </ul>
  </div>
</template>

<script>
import {
  commitProject,
  pullProject,
  pushProject,
} from "../services/api/client";
export default {
  name: "GitButtons",
  props: {
    id: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      commitMessage: "",
    };
  },
  methods: {
    commit() {
      commitProject(this.id, this.commitMessage);
    },
    push() {
      pushProject(this.id);
    },
    async pull() {
      await pullProject(this.id);
      this.$emit("reloadFile");
    },
    clone() {
      navigator.clipboard.writeText(`${window.location.origin}/git/${this.id}`);
    },
  },
};
</script>

<style scoped>
.git-button-list {
  list-style: none;
}

.git-button-list li {
  margin-bottom: 0.75em;
}
</style>
