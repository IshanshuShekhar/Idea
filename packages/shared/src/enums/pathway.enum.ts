export enum Pathway {
  STUDY = 'STUDY',
  BLUE_CARD = 'BLUE_CARD',
  VOCATIONAL = 'VOCATIONAL', // Ausbildung
  AUSBILDUNG = 'VOCATIONAL',
  EMPLOYMENT = 'BLUE_CARD', // Alias for Blue Card
}

export const PATHWAY_CONFIG: Record<string, { title: string; description: string; minGermanLevel: string }> = {
  [Pathway.STUDY]: {
    title: 'University Study in Germany',
    description: 'Bachelor or Master degree programs at recognized German universities',
    minGermanLevel: 'B2',
  },
  [Pathway.BLUE_CARD]: {
    title: 'EU Blue Card / Skilled Employment',
    description: 'Skilled worker immigration and EU Blue Card for qualified Indian graduates',
    minGermanLevel: 'A2',
  },
  [Pathway.VOCATIONAL]: {
    title: 'Vocational Training (Ausbildung)',
    description: 'Dual vocational training programs with paid company apprenticeship',
    minGermanLevel: 'B1',
  },
};
