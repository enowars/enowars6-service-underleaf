<template>
  <UsernameAndPassword
    :error="error"
    title="Login"
    @submit="onSubmit"
  ></UsernameAndPassword>
</template>
<script>
import UsernameAndPassword from "../components/UsernameAndPassword.vue";
import { login } from "../services/api/client.js";

export default {
  name: "LoginView",
  components: { UsernameAndPassword },
  data() {
    return {
      error: "",
    };
  },
  methods: {
    onSubmit(data) {
      const { username, password } = data;

      login(username, password).then((resp) => {
        if (resp.data.status === "ok") {
          this.$router.push("/");
        } else {
          this.error = resp.data.status;
        }
      });
    },
  },
};
</script>
