<template>
  <b-table :items="filesItems" striped hover>
    <template v-slot:cell(name)="row">
      <div @click="$emit('selected', row.item.name)" style="cursor: pointer;">
        {{ row.item.name }}
      </div>
    </template>
  </b-table>
</template>
<script>
import { listFiles } from '../services/api/client.js';

export default {
  props: {
    id: {
      type: String,
      required: true
    }
  },
  data(){
    return {
      files: []
    }
  },
  computed: {
    filesItems(){
      return this.files.map(file => {
        return {
          name: file,
        }
      });
    }
  },
  async mounted(){
    this.files = (await listFiles(this.id)).data.files.sort();
  }
}
</script>