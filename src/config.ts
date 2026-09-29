/**
 * Host-editable content (see README → "Personalizar").
 * Keep it free of concrete dates/times: the plan is coordinated in the group.
 */
export const PLAYER = {
  firstName: 'Santiago',
  lastName: 'Laguna',
};

export const FRIENDS = ['Rafa', 'Tomás C', 'Tomás P'] as const;

export const INVITATION = {
  headline: 'Estás invitado a un escape room de verdad',
  body:
    'Esta caja fue el calentamiento. La próxima tiene candados reales, un reloj de 60 minutos y un equipo esperándote.',
  date: 'Lo coordinamos entre todos',
  where: 'Te mandamos la dirección por WhatsApp',
  dress: 'Ropa cómoda. El magnesio, opcional.',
  closing: 'Con cariño,',
  signature: FRIENDS.join(' · '),
};
