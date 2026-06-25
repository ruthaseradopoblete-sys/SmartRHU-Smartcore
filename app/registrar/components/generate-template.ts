export function generatePatientTemplate() {
  const a    = document.createElement('a')
  a.href     = '/RHU_Lopez_Patient_Import_Template.xlsx'
  a.download = 'RHU_Lopez_Patient_Import_Template.xlsx'
  a.click()
}