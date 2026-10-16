<template>
  <footer class="footer">
    <div class="footer__inner">
      <div class="footer__brand">
        <div class="navbar__logo">
          <div class="navbar__logo-icon">N</div>
          <span>Intelligent <span class="text-gradient">ERP</span></span>
        </div>
        <p>Empowering Smart Business Growth.</p>
      </div>
      <div class="footer__links">
        <a href="/about">About Us</a>
        <a href="/contact">Contact</a>
        <a href="/privacy">Privacy Policy</a>
      </div>
    </div>
    <div class="footer__bottom">
      &copy; {{ new Date().getFullYear() }} Intelligent Technologies Limited. All rights reserved.
    </div>
  </footer>
</template>

<style scoped>
.footer {
  padding: 4rem 2rem;
  background: #f8fafc;
  margin-top: 4rem;
}
.footer__inner {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 2rem;
}
.footer__links {
  display: flex;
  gap: 1.5rem;
}
.footer__bottom {
  text-align: center;
  margin-top: 3rem;
  padding-top: 2rem;
  border-top: 1px solid #e2e8f0;
  color: #64748b;
}
</style>
