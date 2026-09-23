REVOKE ALL ON FUNCTION public.tg_qa_monitoring_set_unit() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.tg_qa_monitoring_set_unit() FROM anon;
REVOKE ALL ON FUNCTION public.tg_qa_monitoring_set_unit() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.tg_qa_monitoring_set_unit() TO service_role;