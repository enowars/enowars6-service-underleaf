<template>
  <username-and-password
    :error="error"
    title="Register"
    @submit="onSubmit"
  ></username-and-password>
</template>
<script>
import UsernameAndPassword from "../components/UsernameAndPassword.vue";
import { register } from "../services/api/client.js";

export default {
  name: "RegisterView",
  components: { UsernameAndPassword },
  data() {
    return {
      error: "",
    };
  },
  methods: {
    onSubmit(data) {
      const { username, password } = data;

      register(username, password).then((resp) => {
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
