export function generatePatientTemplate() {
  const a    = document.createElement('a')
  a.href     = '/Import Template.xlsx'
  a.download = 'Import Template.xlsx'
  a.click()
}