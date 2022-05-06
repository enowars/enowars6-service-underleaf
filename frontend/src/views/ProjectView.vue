<template>
    <splitpanes class="default-theme" vertical style="height: 100vh">
        <pane style="overflow-y: auto">
            <file-list :id="id" @selected="onFileSelected"></file-list>
        </pane>
        <pane style="overflow-y: auto">
            
        </pane>
        <pane style="overflow-y: auto">
            
        </pane>
    </splitpanes>
</template>
<script>
import { Splitpanes, Pane } from "splitpanes";
import "splitpanes/dist/splitpanes.css";
import FileList from '../components/FileList.vue';

export default {
    name: 'ProjectView',
    components: {
        Splitpanes,
        Pane,
        FileList,
    },
    computed: {
        id(){
            return this.$route.params.id;
        }
    },
    methods: {
        onFileSelected(file){
            console.log(file);
        }
    }
}
</script>