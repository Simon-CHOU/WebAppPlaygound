import { createApp } from './app';

const app = createApp();
const port = process.env.PORT || 3001;

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
  console.log(`📁 Upload directory: ${process.env.UPLOAD_DIR || 'uploads'}`);
  console.log(`📸 Albums directory: ${process.env.ALBUMS_DIR || 'albums'}`);
});