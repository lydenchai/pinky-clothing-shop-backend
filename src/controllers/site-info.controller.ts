import { Request, Response } from 'express';
import { SiteInfo } from '../models/site-info.model';

// In a real app, this would be stored in DB. For demo, use in-memory object.
let siteInfo: SiteInfo = {
  name: 'Pinky Clothing Shop',
  description: 'A modern clothing shop for all your fashion needs.',
  contactEmail: 'info@pinkyshop.com',
  phone: '+855 12 345 678',
  address: '123 Fashion St, Phnom Penh, Cambodia',
  logoUrl: '/imgs/logo.png',
};

export const getSiteInfo = (req: Request, res: Response) => {
  res.json({ success: true, data: siteInfo });
};

export const updateSiteInfo = (req: Request, res: Response) => {
  const { name, description, contactEmail, phone, address, logoUrl } = req.body;
  siteInfo = {
    ...siteInfo,
    ...(name !== undefined ? { name } : {}),
    ...(description !== undefined ? { description } : {}),
    ...(contactEmail !== undefined ? { contactEmail } : {}),
    ...(phone !== undefined ? { phone } : {}),
    ...(address !== undefined ? { address } : {}),
    ...(logoUrl !== undefined ? { logoUrl } : {}),
  };
  res.json({ success: true, data: siteInfo });
};
