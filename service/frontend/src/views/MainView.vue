<template>
  <div>
    <navbar-component></navbar-component>
    <project-list v-if="userIsLoggedIn"></project-list>
    <not-logged-in v-else></not-logged-in>
  </div>
</template>

<script>
import NavbarComponent from "../components/NavbarComponent.vue";
import NotLoggedIn from "../components/NotLoggedIn.vue";
import ProjectList from "../components/ProjectList.vue";

export default {
  name: "MainView",
  components: { NavbarComponent, NotLoggedIn, ProjectList },
  computed: {
    userIsLoggedIn() {
      return localStorage.getItem("token") !== null;
    },
  },
};
</script>
