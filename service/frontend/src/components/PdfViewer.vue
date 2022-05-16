<template>
  <div ref="container">
    <div :style="loading || resizeing ? 'display: none' : ''">
      <embed ref="embed" type="application/pdf" />
    </div>
    <div v-if="loading" class="text-center" style="margin-top: 50vh">
      <b-spinner variant="primary" size="lg"></b-spinner>
    </div>
  </div>
</template>

<script>
import { getOutput } from "../services/api/client";

export default {
  props: {
    id: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      loading: true,
      resizeTimeoutId: null,
      resizeing: false,
    };
  },
  methods: {
    setLoading() {
      this.loading = true;
    },
    async loadDocument() {
      const { data } = await getOutput(this.id);

      this.data = data;
      this.realoadDocument();

      this.resize();
    },
    realoadDocument() {
      const blobUrl = URL.createObjectURL(
        new Blob([this.data], { type: "application/pdf" })
      );
      this.$refs.embed.src = blobUrl + "#toolbar=0";
      this.loading = false;
    },
    resize() {
      if (
        !(this.loading || this.resizeing) &&
        this.$refs?.container?.parentElement
      ) {
        const { width, height } =
          this.$refs.container.parentElement.getBoundingClientRect();

        const dimsChanged =
          this.$refs.embed.width !== width ||
          this.$refs.embed.height !== height;

        this.$refs.embed.width = width;
        this.$refs.embed.height = height;

        if (dimsChanged) {
          this.realoadDocument();
        }
      }
    },
    setResizing(val) {
      this.resizeing = val;
    },
  },
  mounted() {
    this.loadDocument();
    new ResizeObserver(this.resize.bind(this)).observe(
      this.$refs.container.parentElement
    );
  },
};
</script>
