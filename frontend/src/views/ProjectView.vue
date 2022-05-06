<template>
    <h1> {{id}} </h1>
</template>
<script>
export default {
    name: 'ProjectView',
    computed: {
        id(){
            return this.$route.params.id;
        }
    }
}
</script>