CREATE POLICY "Authenticated users can update servicos"
ON public.servicos
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);