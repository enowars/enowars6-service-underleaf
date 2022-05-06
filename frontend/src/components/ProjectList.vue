<template>
    <div class="container p-4">
        <b-table :items="projects" :fields="['name']" selectable show-empty striped hover>
            <template v-slot:cell(name)="row">
                <router-link :to="'/project/' + row.item.id ">{{ row.item.name }}</router-link>
            </template>
        </b-table>
    </div>
</template>

<script>
import { listProjects } from '../services/api/client.js';

export default {
    name: 'ProjectList',
    data() {
        return {
            projects: []
        }
    },
    async mounted(){
        this.projects = (await listProjects()).data.projects;
    }
}
</script>