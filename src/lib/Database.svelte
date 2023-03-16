<script>
    export let section = "";
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

    window.edit_case = function (e) {
        solução_para_editar = e + 1;
        solução = ex.soluções[e].texto;
        caso_da_solução = ex.soluções[e].caso_da_solução;
    };

    const supabase_key =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhZ3NqaG1tc3RvaXFxbndpdnVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE2Nzg3MTQ5OTQsImV4cCI6MTk5NDI5MDk5NH0.AjdbEkw1loUMKOaxYe0GAGd1u7XvrIA_17pMNSjaCqg";
    import { createClient } from "@supabase/supabase-js";
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
                    console.log("ooooooooooooo", payload);
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
                    console.log("ooooooooooooo", payload);
                    let q = all[tb].find((o) => o.id == payload.new.id);
                    Object.keys(payload.new).forEach(
                        (k) => (q[k] = payload.new[k])
                    );
                    all = all;
                }
            )
            .subscribe();
        return r.data || [];
    }

    function handle_new_word(e) {
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
        Object.keys(e).forEach((k) => (ex[k] = e[k]));
        let r;
        if (eid) r = await supabase.from("exercícios").update(e).eq("id", eid);
        else r = await supabase.from("exercícios").insert(e);
        e = { casos: [] };
        eid = null;
        section += "s";
    }

    function edit(c) {
        eid = c.id;
        section = "exercício";
        const { título, teoria, instruções, casos } = c;
        e = { título, teoria, instruções, casos };
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
            body: createBody(c),
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
        o += c.soluções
            ? "<h3>Soluções</h3>" +
              toSolutions(c.soluções, c.casos ? c.casos.length : 0)
            : "";
        return o;
    }

    function toParagrafs(s) {
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
        return "<ol><li>" + p.join("</li><li>") + "</li></ol>";
    }

    function toSolutions(j, casos) {
        if (!Array.isArray(j)) return "";
        return (
            toStatisticInfo(j) +
            "<ul>" +
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
                              o.texto +
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

    function toStatisticInfo(j) {
        if (!j.length) return "";
        let solvers = {};
        j.map((o) => (solvers[o.nome_do_estudante] = true));
        solvers = Object.keys(solvers);
        let sl = solvers.length;
        let al = j.length;
        return (
            "&#9432; <span style='color:grey;font-size:0.8em'>" +
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
            "</span>"
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

    async function add_solution() {
        let s = solução.replace(/(^\s+|\s$)/g, "");
        solução = "";
        adding_solution = false;

        if (!s) return false;
        if (solução_para_editar) {
            let e = ex.soluções[solução_para_editar - 1];
            e.texto = s;
            e.caso = caso_da_solução || null;
            ex = ex;
        } else {
            if (!ex.soluções) ex.soluções = [];
            if (nome_do_estudante)
                localStorage.setItem("nome_do_estudante", nome_do_estudante);
            ex.soluções[ex.soluções.length] = {
                texto: s,
                caso: caso_da_solução || null,
                nome_do_estudante,
            };
        }
        solução_para_editar = null;
        caso_da_solução = null;
        let sol = { soluções: ex.soluções };
        if (!ex.iniciado) sol.iniciado = "NOW()";

        let r = await supabase.from("exercícios").update(sol).eq("id", ex.id);
        console.log(r);
    }

    function save_email(f) {
        let em = f.target.email.value;
        localStorage.setItem("email", em);
        if (to_baixar) baixar(to_baixar);
        ask_for_email = false;
        to_baixar = null;
    }
</script>

<div>
    {#if ask_for_email}
        <p>Qual é o teu e-mail?</p>
        <form on:submit|preventDefault={save_email}>
            <input name="email" />
            <button>adiciona</button>
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
                <button on:click={edit(ex)}>editar</button>
                <button on:click={(o) => (adding_solution = true)}
                    >adicionar uma solução</button
                >
                {#if adding_solution || solução_para_editar}
                    {#if !localStorage.getItem("nome_do_estudante")}
                        <p>Qual é o teu nome?</p>
                        <input bind:value={nome_do_estudante} use:focus />
                    {/if}
                    {#if ex.casos && ex.casos.length}
                        <p>
                            caso <select bind:value={caso_da_solução}>
                                {#each ex.casos as _, i}
                                    <option value={i + 1}>{i + 1}</option>
                                {/each}
                            </select>
                        </p>
                    {/if}
                    <p>A solução</p>
                    <input bind:value={solução} use:focus />
                    {#if solução_para_editar}
                        <button on:click={add_solution}>salvar</button>
                    {:else}
                        <button on:click={add_solution}>adicionar</button>
                    {/if}
                    <div use:intoView />
                {/if}
            {:else}
                <button on:click={(o) => (section = "exercício")}
                    >crear um exercício</button
                >
                {#each all[section] as c, index}
                    <p
                        id={c.id}
                        on:click={(o) => (ex = c)}
                        on:keydown={(o) => (ex = c)}
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
            <textarea bind:value={e.teoria} />
            <p>instruções</p>
            <textarea bind:value={e.instruções} />
            <button
                on:click={() => {
                    e.casos ? (e.casos[e.casos.length] = "") : (e.casos = [""]);
                }}>adicionar um caso</button
            >
            {#if e.casos && e.casos.length}
                <p>casos</p>
                {#each e.casos as _, i}
                    <input bind:value={e.casos[i]} />
                {/each}
            {/if}
            <button on:click={save_exercise}>salvar</button>
        {/if}{/if}
</div>

<style>
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
    }
    p {
        margin: 0;
        margin-top: 12px;
    }
    button {
        margin-top: 12px;
    }
</style>
