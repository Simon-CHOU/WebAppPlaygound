import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ConfigProvider, App as AntdApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { Layout } from 'antd';
import AlbumListPage from './pages/AlbumListPage';
import AlbumDetailPage from './pages/AlbumDetailPage';
import 'antd/dist/reset.css';
import './App.css';

const { Header, Content } = Layout;

function App() {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#1890ff',
          borderRadius: 8,
        },
      }}
    >
      <AntdApp>
        <Router>
          <Layout style={{ minHeight: '100vh' }}>
            <Header style={{
              background: '#fff',
              padding: '0 24px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              display: 'flex',
              alignItems: 'center'
            }}>
              <h1 style={{ margin: 0, color: '#1890ff', fontSize: '20px' }}>
                Video Frame Catcher
              </h1>
            </Header>
            <Content style={{ padding: '24px' }}>
              <Routes>
                <Route path="/" element={<AlbumListPage />} />
                <Route path="/albums/:id" element={<AlbumDetailPage />} />
              </Routes>
            </Content>
          </Layout>
        </Router>
      </AntdApp>
    </ConfigProvider>
  );
}

export default App;
