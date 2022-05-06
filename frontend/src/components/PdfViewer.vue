<template>
  <div style="background-color: #555; text-align: center" ref="container">
    <div v-for="page in doc.numPages" v-bind:key="page">
      <canvas ref="canvas" class="page"></canvas>
      <div ref="text" class="textLayer"></div>
    </div>
  </div>
</template>

<script>
import "pdfjs-dist/webpack";
import { getDocument } from "pdfjs-dist/build/pdf";
import { TextLayerBuilder } from "pdfjs-dist/web/pdf_viewer";
import "pdfjs-dist/web/pdf_viewer.css";

export default {
  name: "PdfViewer",
  props: {
    src: {
      type: String,
      required: true,
    },
  },
  methods: {
    scheduleResize() {
      if (this.resizeTimeoutId) {
        clearTimeout(this.resizeTimeoutId);
      }
      this.resizeTimeoutId = setTimeout(
        (() => {
          this.resizeTimeoutId = null;
          this.resize();
        }).bind(this),
        250
      );
    },
    getScale() {
      return this.$refs.container.getBoundingClientRect().width / 625;
    },
    resize() {
      this.renderCanvas(this.getScale());
    },
    async loadDocument() {
      this.doc = await getDocument(this.src).promise;

      this.$forceUpdate();

      this.renderCanvas(this.getScale());
    },
    async renderCanvas(scale) {
      const renderScale = 2;

      for (let pageNum = 1; pageNum <= this.doc.numPages; pageNum++) {
        const page = await this.doc.getPage(pageNum);

        const viewport = page.getViewport({ scale: scale });

        const canvas = this.$refs.canvas[pageNum - 1];
        const canvasOffset = canvas.getBoundingClientRect();
        canvas.width = viewport.width * renderScale;
        canvas.height = viewport.height * renderScale;
        canvas.style.width = viewport.width + "px";
        canvas.style.height = viewport.height + "px";
        canvas.style.top = canvasOffset.top + "px";
        canvas.style.left = canvasOffset.left + "px";

        const context = canvas.getContext("2d");

        page.render({
          canvasContext: context,
          viewport: page.getViewport({ scale: scale * renderScale }),
        });
      }
      this.renderTextLayer(scale);
    },
    async renderTextLayer(scale) {
      for (let pageNum = 1; pageNum <= this.doc.numPages; pageNum++) {
        const page = await this.doc.getPage(pageNum);

        const viewport = page.getViewport({ scale: scale });

        const canvas = this.$refs.canvas[pageNum - 1];
        const canvasOffset = canvas.getBoundingClientRect();

        const textLayerDiv = this.$refs.text[pageNum - 1];
        textLayerDiv.style.height = viewport.height + "px";
        textLayerDiv.style.width = viewport.width + "px";
        textLayerDiv.style.top = canvasOffset.top + "px";
        textLayerDiv.style.left = canvasOffset.left + "px";

        const textContent = await page.getTextContent();
        const textLayer = new TextLayerBuilder({
          textLayerDiv: textLayerDiv,
          pageIndex: pageNum - 1,
          viewport: viewport,
        });

        textLayer.setTextContent(textContent);
        textLayer.render();
      }
    },
  },
  created() {
    this.doc = { numPages: 0 };
    this.loadDocument();
  },
  mounted() {
    new ResizeObserver(this.scheduleResize.bind(this)).observe(
      this.$refs.container
    );
  },
};
</script>

<style scoped>
.page {
  border: 1px solid black;
}
</style>
