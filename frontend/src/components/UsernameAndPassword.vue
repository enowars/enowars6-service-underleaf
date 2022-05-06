<template>
<div>
    <navbar-component></navbar-component>
    <div class="container p-4">
      <b-alert v-if="error" variant="danger" show> {{error}} </b-alert>
      <b-card :title="title">
        <hr>
        <div class="card-body">
          <b-form @submit="onSubmit">
            <b-form-group label="Username" label-for="username">
              <b-form-input id="username" type="text" v-model="username" required></b-form-input>
            </b-form-group>
            <b-form-group label="Password" label-for="password">
              <b-form-input id="password" type="password" v-model="password" required></b-form-input>
            </b-form-group>
            <b-button type="submit" variant="primary">Submit</b-button>
          </b-form>
        </div>
      </b-card>
    </div>
</div>
</template>

<script>
import NavbarComponent from './NavbarComponent.vue';

export default {
  name: 'UsernameAndPassword',
  components: { NavbarComponent },
  data() {
    return {
      username: '',
      password: '',
    }
  },
  methods: {
    onSubmit(evnt){
      evnt.stopPropagation();
      evnt.preventDefault();

      this.$emit('submit', {
        username: this.username,
        password: this.password,
      });
    }
  },
  props:{
    title: {
      type: String,
      required: true
    },
    error: {
      type: String,
      required: false
    }
  },
}
</script>
