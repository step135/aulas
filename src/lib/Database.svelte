<script>
    export let section = "";
    import autosize from "svelte-autosize";
    let word,
        meaning,
        u_e,
        p,
        e = { casos: [] },
        eid = null,
        ex = {};
    let all = {};
    all["dicionário"] = [];
    all["exercícios"] = [];
    let new_word = false;
    let nome_do_estudante = localStorage.getItem("nome_do_estudante") || null;
    let adding_solution = null;
    let solução = null;
    let caso_da_solução = null;
    let solução_para_editar = null;
    let ask_for_email, to_baixar;
    let items_per_student = null;
    let titles_of_items_per_student = null;
    let taken_item = null;
    let palavras_do_caso = null;

    window.edit_case = function (e) {
        save_possible_name();
        solução_para_editar = e + 1;
        solução = ex.soluções[e].texto;
        caso_da_solução = ex.soluções[e].caso_da_solução;
    };

    const supabase_key =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhZ3NqaG1tc3RvaXFxbndpdnVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE2Nzg3MTQ5OTQsImV4cCI6MTk5NDI5MDk5NH0.AjdbEkw1loUMKOaxYe0GAGd1u7XvrIA_17pMNSjaCqg";
    import { createClient } from "@supabase/supabase-js";
    import { is_function } from "svelte/internal";
    const supabase = createClient(
        "https://aagsjhmmstoiqqnwivuo.supabase.co",
        supabase_key
    );

    async function get_all(tb) {
        const r = await supabase
            .from(tb)
            .select()
            .order("id", { ascending: false });
        supabase
            .channel("any_string_you_want_insert" + tb)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: tb,
                },
                (payload) => {
                    console.log("ooooooooooooo INSERT", payload);
                    all[tb].unshift(payload.new);
                    all = all;
                }
            )
            .subscribe();
        supabase
            .channel("any_string_you_want_update" + tb)
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: tb,
                },
                (payload) => {
                    console.log("ooooooooooooo UPDATE", payload);
                    let q = all[tb].find((o) => o.id == payload.new.id);
                    Object.keys(payload.new).forEach(
                        (k) => (q[k] = payload.new[k])
                    );
                    all = all;
                    ex = ex;
                    e = e;
                }
            )
            .subscribe();
        supabase
            .channel("any_string_you_want_delete" + tb)
            .on(
                "postgres_changes",
                {
                    event: "DELETE",
                    schema: "public",
                    table: tb,
                },
                (payload) => {
                    console.log("ooooooooooooo DELETE", payload);
                    let q = all[tb].find((o) => o.id == payload.old.id);
                    q = {};
                    all[tb] = all[tb].filter((o) => o.id !== payload.old.id);
                    all = all;
                    ex = ex;
                    e = e;
                }
            )
            .subscribe();
        return r.data || [];
    }

    function handle_new_word() {
        add_new_word(word, meaning);
        //e.target.reset();
        //https://svelte.dev/repl/9d071bd67ce547819bbad9b8364804a6?version=3.38.3
        //https://stackoverflow.com/questions/73308546/clear-input-field-in-svelte-after-form-submission
        word = "";
        meaning = "";
    }

    async function add_new_word(word, meaning) {
        const data = {
            palavra: word,
            significado: meaning,
            //autor: "RELATION_RECORD_ID",
            //editores: ["RELATION_RECORD_ID"],
        };
        new_word = false;
        trim_json(data);
        const r = await supabase.from("dicionário").insert(data).select();
    }

    async function show_all() {
        all["dicionário"] = await get_all("dicionário");
        all["exercícios"] = await get_all("exercícios");
    }
    show_all();

    async function save_exercise() {
        if (!e.título || !e.instruções) return false;
        if (e.casos) e.casos = e.casos.filter((w) => w.length);
        trim_json(e);
        Object.keys(e).forEach((k) => (ex[k] = e[k]));
        let r;
        if (eid) r = await supabase.from("exercícios").update(e).eq("id", eid);
        else {
            r = await supabase.from("exercícios").insert(e).select();
            console.log(r);
            if (!r.error) {
                let id = r.data[0].id;
                console.log("id", id);
                eid = ex.id = id;
            }
        }
        empty_exercise_form();
        section += "s";
    }

    function edit(c) {
        eid = c.id;
        section = "exercício";
        //const { título, teoria, instruções, casos } = c;
        //e = { título, teoria, instruções, casos };
        e = c;
    }

    async function baixar(c) {
        let email = localStorage.getItem("email");
        if (!email) {
            ask_for_email = true;
            to_baixar = c;
            return;
        }
        const d = {
            title: c.título,
            body: safe_body(createBody(c)),
            recipient: email,
        };
        const rawResponse = await fetch("https://aulasboas.pt/_email", {
            method: "POST",
            mode: "cors",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify(d),
        });
        const content = await rawResponse.json();

        console.log(content);
    }

    function createBody(c) {
        let o = "";
        o += c.teoria ? "<h3>Teoria</h3>" + toParagrafs(c.teoria) : "";
        o += c.instruções
            ? "<h3>Instruções</h3>" + toParagrafs(c.instruções)
            : "";
        o +=
            c.casos && c.casos.length
                ? "<h4>Casos</h4>" + toCases(c.casos)
                : "";
        o += c.resultados ? toCases(c.casos) : "";
        o += c.soluções ? "<h3>Soluções</h3>" + toSolutions(c.soluções) : "";
        return o;
    }

    function safe_body(s) {
        return s.replace(
            /(<h[0-5])/g,
            '$1 style="font-weight:bold;display:block;margin:10px 0;"'
        );
    }

    function toParagrafs(s) {
        return window.marked.parse(s);
        return (
            "<p>" +
            s
                .replace(/\r/g, "")
                .replace(/^\s+|\s+$/g, "")
                .replace(/\n/g, "</p><p>") +
            "</p>"
        );
    }

    function toCases(p) {
        titles_of_items_per_student = items_per_student = null;
        if (!Array.isArray(p) || !p.length) return;
        if (p[0].match(":") && p[0].split(",").length > 3) {
            items_per_student = p.map((x) =>
                x
                    .split(":")
                    .pop()
                    .replace(/^\s+/, "")
                    .replace(/,\s*/g, ",")
                    .split(",")
            );
            p = titles_of_items_per_student = p.map((x) => x.split(":")[0]);
        }
        return (
            '<ol style="margin:6px 0;"><li>' +
            p.join("</li><li>") +
            "</li></ol>"
        );
    }

    function take_item() {
        if (!titles_of_items_per_student) return false;
        taken_item = [titles_of_items_per_student[0], items_per_student[0][0]];
        return true;
    }

    function get_taken_items() {
        if (!ex || !ex.soluções) return null;
        return ex.soluções.map((s) => s.palavras_do_caso).filter();
    }

    function get_available_items() {
        let ti = get_taken_items();
        if (!items_per_student || !ti) return null;
        return items_per_student.map((it) => it.filter((x) => !ti.includes(x)));
    }

    function get_solutions_per_student() {
        let nome_do_estudante = localStorage.getItem("nome_do_estudante");
        if (!ex || !ex.soluções || !nome_do_estudante) return null;
        let sols = [];
        let sols_per_case = [];
        ex.soluções.map((s) => {
            if (s.nome_do_estudante == nome_do_estudante) {
                sols.push(s);
                if (s.caso) {
                    let p = sols_per_case[s.caso];
                    if (!Array.isArray(p)) p = [];
                    p.push(s);
                }
            }
        });
        return [sols, sols_per_case];
    }

    function toSolutions(j) {
        if (!Array.isArray(j)) return "";
        return (
            toStatisticInfo(j) +
            '<ul style="margin:6px 0;">' +
            j
                .map(
                    (o, index) =>
                        "<li>" +
                        (o.caso
                            ? '<span style="color:gray">(' +
                              o.caso +
                              ")</span> "
                            : "") +
                        (o.texto
                            ? "<span onclick='edit_case(" +
                              index +
                              ")' class='clickable'>" +
                              basic_formatting(o.texto) +
                              "</span>"
                            : "") +
                        (o.nome_do_estudante
                            ? ' <span style="color:gray;font-size:0.8em">' +
                              o.nome_do_estudante +
                              "</span>"
                            : "") +
                        "</li>"
                )
                .join("") +
            "</ul>"
        );
    }

    function basic_formatting(s) {
        return s
            .replace(/\*\*([^\n*]*)\*\*/g, "<b>$1</b>")
            .replace(/\*([^\n*]*)\*/g, "<em>$1</em>");
    }

    function toStatisticInfo(j) {
        if (!j.length) return "";
        let solvers = {};
        j.map((o) => (solvers[o.nome_do_estudante] = true));
        solvers = Object.keys(solvers);
        let sl = solvers.length;
        let al = j.length;
        return (
            "<div>&#9432; <span style='color:grey;font-size:0.8em'>" +
            "<span style='color:red'>" +
            sl +
            "</span>" +
            " estudante" +
            (sl > 1 ? "s adicionaram " : " adicionou ") +
            "<span style='color:red'>" +
            al +
            "</span>" +
            " soluç" +
            (al > 1 ? "ões" : "ão") +
            "</span></div>"
        );
    }

    function focus(el) {
        el.focus();
    }

    function intoView(el) {
        el.scrollIntoView({
            behavior: "smooth",
        });
    }

    function hideOnClick(e) {
        e.addEventListener("click", function (t) {
            t.target.style.display = "none";
        });
    }

    async function add_or_edit_solution() {
        let s = trim(solução);

        if (!s) return false;
        if (solução_para_editar) {
            let e = ex.soluções[solução_para_editar - 1];
            e.texto = s;
            e.caso = caso_da_solução || null;
            ex = ex;
        } else {
            save_possible_name();
            if (!localStorage.getItem("nome_do_estudante")) return false;
            if (!ex.soluções) ex.soluções = [];
            ex.soluções[ex.soluções.length] = {
                texto: s,
                caso: caso_da_solução || null,
                palavras_do_caso,
                nome_do_estudante,
            };
        }
        solução = "";
        adding_solution = false;
        solução_para_editar = null;
        caso_da_solução = null;
        let sol = { soluções: ex.soluções };
        if (!ex.iniciado) sol.iniciado = "NOW()";
        trim_json(sol);

        let r = await supabase.from("exercícios").update(sol).eq("id", ex.id);
        console.log(r);
    }

    function save_possible_name(){
        if (nome_do_estudante)
                localStorage.setItem("nome_do_estudante", nome_do_estudante);
    }

    function save_email(f) {
        let em = f.target.email.value;
        localStorage.setItem("email", trim(em));
        if (to_baixar) baixar(to_baixar);
        ask_for_email = false;
        to_baixar = null;
    }

    function create_exercise() {
        section = "exercício";
        empty_exercise_form();
    }

    function empty_exercise_form() {
        e = { casos: [] };
        eid = null;
    }

    /**
     * @param {string} s
     */
    function trim(s) {
        return s.replace(/(^\s+|\s+$)/g, "");
    }

    function trim_json(j) {
        Object.keys(j).map((o) => {
            if (typeof j[o] == "object" && j[o]) trim_json(j[o]);
            if (typeof j[o] == "string") j[o] = trim(j[o]);
        });
    }
</script>

<svelte:head>
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
</svelte:head>

<div>
    {#if ask_for_email}
        <p>Qual é o teu e-mail?</p>
        <form on:submit|preventDefault={save_email}>
            <input name="email" />
            <button>adicionar</button>
        </form>
    {:else}
        {#if section == "dicionário"}
            {#if !new_word}
                <button
                    on:click={(o) => (new_word = true)}
                    on:keydown={(o) => (new_word = true)}
                >
                    adicionar nova expressão
                </button>
            {:else}
                <form on:submit|preventDefault={handle_new_word}>
                    <p>palavra</p>
                    <input bind:value={word} use:focus />
                    <p>significado</p>
                    <input bind:value={meaning} />
                    <button>salvar</button>
                </form>
            {/if}
            {#each all[section] as c, index}
                <p id={c.id} class="clickable">
                    <span class="pal">{c.palavra}</span>
                    <span class="sig">{c.significado}</span>
                </p>
                <hr />
            {/each}
        {/if}
        {#if section == "exercícios"}
            {#if ex.título}
                <h2>{ex.título}</h2>
                <div class="body">{@html createBody(ex)}</div>
                <button
                    on:click={(o) => {
                        ex = {};
                        adding_solution = false;
                        solução_para_editar = null;
                    }}>fechar</button
                >
                <button on:click={baixar(ex)} use:hideOnClick>baixar</button>
                <button on:click={() => edit(ex)}>editar</button>
                <button on:click={() => (adding_solution = true) && take_item()}
                    >adicionar uma solução</button
                >
                {#if adding_solution || solução_para_editar}
                    {#if !localStorage.getItem("nome_do_estudante")}
                        <p>Qual é o teu nome?</p>
                        <input bind:value={nome_do_estudante} use:focus />
                    {/if}
                    {#if ex.casos && ex.casos.length}
                        {#if items_per_student}
                            {#each items_per_student as it, i}
                                <h4>{titles_of_items_per_student[i]}</h4>
                                <p>
                                    {it.join(", ")}
                                </p>
                            {/each}
                            {#if taken_item}
                                <h4>
                                    taken item: {taken_item[1]} ({taken_item[0]})
                                </h4>
                            {/if}
                        {:else}
                            <p>
                                caso <select bind:value={caso_da_solução}>
                                    {#each ex.casos as _, i}
                                        <option value={i + 1}>{i + 1}</option>
                                    {/each}
                                </select>
                            </p>
                        {/if}
                    {/if}
                    <p>A solução</p>
                    {#if !localStorage.getItem("nome_do_estudante")}
                        <textarea bind:value={solução} rows="1" use:autosize />
                    {:else}
                        <textarea
                            bind:value={solução}
                            use:focus
                            rows="1"
                            use:autosize
                        />
                    {/if}
                    {#if solução_para_editar}
                        <button on:click={add_or_edit_solution}>salvar</button>
                    {:else}
                        <button on:click={add_or_edit_solution}
                            >adicionar</button
                        >
                    {/if}
                    <div use:intoView />
                {/if}
            {:else}
                <button on:click={create_exercise}>crear um exercício</button>
                {#each all[section] as c, index}
                    <p
                        id={c.id}
                        on:click={() => (ex = c)}
                        on:keydown={() => (ex = c)}
                        class="clickable"
                    >
                        {c.título}
                    </p>
                    <hr />
                {/each}
            {/if}
        {/if}
        {#if section == "exercício"}
            <p>título</p>
            <input type="text" bind:value={e.título} />
            <p>teoria</p>
            <textarea bind:value={e.teoria} use:autosize />
            <p>instruções</p>
            <textarea bind:value={e.instruções} use:autosize />
            <button
                on:click={() => {
                    e.casos ? (e.casos[e.casos.length] = "") : (e.casos = [""]);
                }}>adicionar um caso</button
            >
            {#if e.casos && e.casos.length}
                <p>casos</p>
                {#each e.casos as _, i}
                    <div><input bind:value={e.casos[i]} /></div>
                {/each}
            {/if}
            <button on:click={save_exercise}>salvar</button>
        {/if}
    {/if}
</div>

<style>
    :global(blockquote) {
        font-weight: 100;
        font-size: 2rem;
        line-height: 1.4;
        position: relative;
        margin: 0;
        padding: 1rem 2.5rem;
    }

    :global(blockquote:before),
    :global(blockquote:after) {
        position: absolute;
        color: #f1efe6;
        font-size: 8rem;
        width: 4rem;
        height: 4rem;
    }

    :global(blockquote:before) {
        content: "“";
        left: -1rem;
        top: -3rem;
    }

    :global(blockquote:after) {
        content: "”";
        right: -1rem;
        bottom: 1rem;
    }

    :global(body) {
        color: rgba(255, 255, 255, 0.87);
        background: #141414;
    }
    :global(button) {
        background-color: #3e3e3e;
        color: #c6c6c6;
    }
    p,
    .body {
        text-align: left;
    }
    h2 {
        color: beige;
        background: #252320;
        box-shadow: 0px 5px 30px #b5b5a8;
    }
    :global(h3):after {
        content: "";
        display: block;
        border-bottom: 1px solid;
        opacity: 0.2;
    }
    :global(h3),
    :global(h4) {
        color: darkorange;
    }
    .pal {
        color: yellowgreen;
    }
    :global(.clickable) {
        cursor: pointer;
    }
    input,
    textarea {
        width: 100%;
        font-size: 24px;
        margin-bottom: 6px;
        box-sizing: border-box;
        resize: none;
    }
    p {
        margin: 0;
        margin-top: 12px;
    }
    button {
        margin-top: 12px;
    }
</style>
