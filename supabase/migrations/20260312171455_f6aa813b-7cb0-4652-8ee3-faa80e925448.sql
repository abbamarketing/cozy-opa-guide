INSERT INTO public.user_roles (user_id, role) VALUES ('fa7a3a2d-348e-45bd-a44d-b0914bd37139', 'editor') ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.editors (user_id, display_name, status) VALUES ('fa7a3a2d-348e-45bd-a44d-b0914bd37139', 'Meirxles', 'available') ON CONFLICT DO NOTHING;