/*
  Klistra in Project URL och PUBLISHABLE KEY från Supabase.

  Använd aldrig:
  - Secret key
  - service_role key
  - databaslösenord
*/

window.EHOCKEY_CONFIG = {
  supabaseUrl: "https://oujqnvrczdavqbqaavuh.supabase.co",
  supabasePublishableKey: "sb_publishable_-4cV-I1xCAAZrgdcGCljrQ_T7T0YC5z"
};

/* Huvudmenyn: adminverktygen ligger i kontodropdownen. Visa endast väntande ärenden. */
(() => {
  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = '/header-admin-pending-v1.css?v=20260917-1';
  document.head.appendChild(css);

  const script = document.createElement('script');
  script.src = '/header-admin-pending-v1.js?v=20260917-2';
  script.defer = true;
  document.head.appendChild(script);
})();

/* Webbappen: personlig För dig-start. Samma Supabase-data kan senare återanvändas i Android. */
(() => {
  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = '/webapp-for-you-v1.css?v=20260917-1';
  document.head.appendChild(css);

  const script = document.createElement('script');
  script.src = '/webapp-for-you-v1.js?v=20260917-1';
  script.defer = true;
  document.head.appendChild(script);
})();
