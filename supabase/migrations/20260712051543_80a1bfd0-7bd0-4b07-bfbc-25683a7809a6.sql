UPDATE public.purchases p
SET amount = b.price, currency = COALESCE(p.currency, 'INR')
FROM public.books b
WHERE p.book_id = b.id AND p.amount IS NULL;