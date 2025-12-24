CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql" WITH SCHEMA "pg_catalog";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (new.id, new.raw_user_meta_data ->> 'full_name');
  RETURN new;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: itineraries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.itineraries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    destination text NOT NULL,
    days integer DEFAULT 1 NOT NULL,
    budget text,
    preferences text[] DEFAULT '{}'::text[],
    itinerary_data jsonb NOT NULL,
    is_public boolean DEFAULT false,
    share_token text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    full_name text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    preferences text[] DEFAULT '{}'::text[],
    push_notifications_enabled boolean DEFAULT false
);


--
-- Name: review_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.review_images (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    review_id uuid NOT NULL,
    image_url text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    place_id text NOT NULL,
    rating integer NOT NULL,
    content text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: search_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.search_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    query text NOT NULL,
    category text,
    city text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: wishlists; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wishlists (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    place_id text NOT NULL,
    place_name text NOT NULL,
    place_address text,
    place_image text,
    place_rating numeric(2,1),
    place_category text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: itineraries itineraries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.itineraries
    ADD CONSTRAINT itineraries_pkey PRIMARY KEY (id);


--
-- Name: itineraries itineraries_share_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.itineraries
    ADD CONSTRAINT itineraries_share_token_key UNIQUE (share_token);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);


--
-- Name: review_images review_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_images
    ADD CONSTRAINT review_images_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_user_id_place_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_user_id_place_id_key UNIQUE (user_id, place_id);


--
-- Name: search_history search_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.search_history
    ADD CONSTRAINT search_history_pkey PRIMARY KEY (id);


--
-- Name: wishlists wishlists_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlists
    ADD CONSTRAINT wishlists_pkey PRIMARY KEY (id);


--
-- Name: wishlists wishlists_user_id_place_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlists
    ADD CONSTRAINT wishlists_user_id_place_id_key UNIQUE (user_id, place_id);


--
-- Name: itineraries update_itineraries_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_itineraries_updated_at BEFORE UPDATE ON public.itineraries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: reviews update_reviews_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: review_images review_images_review_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_images
    ADD CONSTRAINT review_images_review_id_fkey FOREIGN KEY (review_id) REFERENCES public.reviews(id) ON DELETE CASCADE;


--
-- Name: review_images Anyone can view review images; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view review images" ON public.review_images FOR SELECT USING (true);


--
-- Name: reviews Anyone can view reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view reviews" ON public.reviews FOR SELECT USING (true);


--
-- Name: review_images Review owner can delete images; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Review owner can delete images" ON public.review_images FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.reviews
  WHERE ((reviews.id = review_images.review_id) AND (reviews.user_id = auth.uid())))));


--
-- Name: review_images Review owner can insert images; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Review owner can insert images" ON public.review_images FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.reviews
  WHERE ((reviews.id = review_images.review_id) AND (reviews.user_id = auth.uid())))));


--
-- Name: itineraries Users can delete own itineraries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own itineraries" ON public.itineraries FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: reviews Users can delete own reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own reviews" ON public.reviews FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: search_history Users can delete own search history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own search history" ON public.search_history FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: wishlists Users can delete own wishlists; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own wishlists" ON public.wishlists FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: itineraries Users can insert own itineraries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own itineraries" ON public.itineraries FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles Users can insert own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: reviews Users can insert own reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own reviews" ON public.reviews FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: search_history Users can insert own search history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own search history" ON public.search_history FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: wishlists Users can insert own wishlists; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own wishlists" ON public.wishlists FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: itineraries Users can update own itineraries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own itineraries" ON public.itineraries FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: reviews Users can update own reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own reviews" ON public.reviews FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: itineraries Users can view own itineraries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own itineraries" ON public.itineraries FOR SELECT USING (((auth.uid() = user_id) OR (is_public = true)));


--
-- Name: profiles Users can view own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: search_history Users can view own search history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own search history" ON public.search_history FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: wishlists Users can view own wishlists; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own wishlists" ON public.wishlists FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: itineraries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.itineraries ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: review_images; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.review_images ENABLE ROW LEVEL SECURITY;

--
-- Name: reviews; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

--
-- Name: search_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;

--
-- Name: wishlists; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;