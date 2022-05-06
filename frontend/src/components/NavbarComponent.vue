<template>
  <ul class="navbar">
    <li class="navitem">
      <router-link to="/" class="navlink">Home</router-link>
    </li>
    <li class="navitem">
      <router-link to="/register" class="navlink">Register</router-link>
    </li>
    <li class="navitem">
      <router-link to="/login" class="navlink">Login</router-link>
    </li>
    <li class="navitem">
      <router-link to="/login" class="navlink" @click="logout"
        >Logout</router-link
      >
    </li>
  </ul>
</template>
<script>
export default {
  name: "NavbarComponent",
  methods: {
    logout() {
      localStorage.removeItem("token");
    },
  },
};
</script>

<style scoped>
.navbar {
  list-style-type: none;
  margin: 5px;
  padding: 0;
  overflow: hidden;
  background-color: #3d6bfe;
}
.navitem {
  float: left;
}
.navlink {
  display: block;
  color: #ccc;
  text-align: center;
  padding: 14px 16px;
  text-decoration: none;
}
.navlink:hover {
  color: #fff;
}
</style>
