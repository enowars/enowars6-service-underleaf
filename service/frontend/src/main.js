import { createApp } from "vue";
import { createRouter, createWebHistory } from "vue-router";
import MainView from "./views/MainView.vue";
import RegisterView from "./views/RegisterView.vue";
import LoginView from "./views/LoginView.vue";
import ProjectView from "./views/ProjectView.vue";

import "bootstrap/dist/css/bootstrap.css";
import "bootstrap-vue-3/dist/bootstrap-vue-3.css";
import BootstrapVue3 from "bootstrap-vue-3";

import App from "./App.vue";

import * as client from "./services/api/client";

window.cli = client;

const routes = [
  { path: "/", component: MainView },
  { path: "/register", component: RegisterView },
  { path: "/login", component: LoginView },
  { path: "/project/:id", component: ProjectView },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

const app = createApp(App);

app.use(BootstrapVue3);
app.use(router);
app.mount("#app");
