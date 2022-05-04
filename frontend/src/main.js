import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import LatexEditor from './views/LatexEditor.vue'
import PdfViewer from './components/PdfViewer.vue'
import App from './App.vue'


const routes = [
    { path: '/', component: LatexEditor },
    { path: '/pdf', component: PdfViewer },
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

const app = createApp(App);

app.use(router);
app.mount('#app')
